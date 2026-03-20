import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardBody,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectItem,
  Tooltip,
} from "@heroui/react";
import {
  HiOutlineBuildingOffice2,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineFilm,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineUserCircle,
  HiOutlineVideoCamera,
} from "react-icons/hi2";
import { HiOutlineExternalLink } from "react-icons/hi";

import { getCompanies } from "../services/companyService";
import {
  analyzeVideoStructure,
  createVideo,
  extractVideoAudio,
  generateVideoScript,
  getVideos,
  transcribeVideoAudio,
} from "../services/videoService";

const initialForm = {
  company_id: "",
  original_url: "",
};

function MetricCard({ label, value, description, dark = false }) {
  return (
    <div
      className={
        dark
          ? "rounded-2xl bg-slate-950/95 px-4 py-3 text-white"
          : "rounded-2xl border border-slate-200 bg-white px-4 py-3"
      }
    >
      <p
        className={
          dark
            ? "text-[11px] uppercase tracking-[0.18em] text-slate-400"
            : "text-[11px] uppercase tracking-[0.18em] text-slate-500"
        }
      >
        {label}
      </p>
      <strong
        className={
          dark
            ? "mt-1 block text-xl font-semibold"
            : "mt-1 block text-xl font-semibold text-slate-950"
        }
      >
        {value}
      </strong>
      <p
        className={
          dark ? "mt-1 text-xs text-slate-300" : "mt-1 text-xs text-slate-500"
        }
      >
        {description}
      </p>
    </div>
  );
}

function formatDuration(seconds) {
  const totalSeconds = Number(seconds);

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "No registrada";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function getPlatformFilterValue(platform) {
  const normalizedPlatform = String(platform || "").trim();

  return normalizedPlatform || "Sin plataforma";
}

function getFilterTriggerLabel(baseLabel, count) {
  if (!count) {
    return baseLabel;
  }

  if (count === 1) {
    return `1 ${baseLabel.slice(0, -1).toLowerCase()}`;
  }

  return `${count} ${baseLabel.toLowerCase()}`;
}

function toggleFilterValue(values, value) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function getStageStatus(isCompleted, isCurrent) {
  if (isCompleted) return "completed";
  if (isCurrent) return "current";
  return "pending";
}

function getDefaultProcessStage({
  hasSource,
  isExtracting,
  hasAudio,
  isTranscribing,
  hasTranscription,
  isAnalyzing,
  hasAnalysis,
  isGenerating,
  hasScript,
}) {
  if (!hasSource) return "audio";
  if (isExtracting) return "audio";
  if (!hasAudio) return "audio";
  if (isTranscribing) return "transcription";
  if (!hasTranscription) return "transcription";
  if (isAnalyzing) return "analysis";
  if (!hasAnalysis) return "analysis";
  if (isGenerating) return "script";
  if (!hasScript) return "script";
  return "script";
}

function getPipelineStage({
  video,
  latestTranscription,
  latestAnalysisJob,
  latestScriptGeneration,
}) {
  if (latestScriptGeneration?.status === "completed") return "Guion generado";
  if (latestScriptGeneration?.status === "processing") return "Generando guion";
  if (
    latestAnalysisJob?.status === "completed" ||
    latestTranscription?.analysis_json
  ) {
    return "Analisis listo";
  }
  if (latestAnalysisJob?.status === "processing")
    return "Analizando estructura";
  if (latestTranscription?.status === "completed") return "Transcripcion lista";
  if (video.audio_status === "ready") return "Audio listo";
  if (video.audio_status === "processing") return "Extrayendo audio";
  return "Pendiente";
}

export default function VideosPage() {
  const [videos, setVideos] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyFilters, setSelectedCompanyFilters] = useState([]);
  const [selectedPlatformFilters, setSelectedPlatformFilters] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [extractingVideoIds, setExtractingVideoIds] = useState([]);
  const [transcribingVideoIds, setTranscribingVideoIds] = useState([]);
  const [analyzingVideoIds, setAnalyzingVideoIds] = useState([]);
  const [generatingVideoIds, setGeneratingVideoIds] = useState([]);
  const [selectedCampaignByVideo, setSelectedCampaignByVideo] = useState({});
  const [selectedStageByVideo, setSelectedStageByVideo] = useState({});
  const [actionErrorByVideo, setActionErrorByVideo] = useState({});

  async function loadPageData() {
    setLoading(true);
    setError("");

    try {
      const [{ companies: nextCompanies }, { videos: nextVideos }] =
        await Promise.all([getCompanies(), getVideos()]);
      setCompanies(nextCompanies);
      setVideos(nextVideos);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "No se pudieron cargar los videos.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshVideos() {
    try {
      const [{ companies: nextCompanies }, { videos: nextVideos }] =
        await Promise.all([getCompanies(), getVideos()]);
      setCompanies(nextCompanies);
      setVideos(nextVideos);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "No se pudieron cargar los videos.",
      );
    }
  }

  useEffect(() => {
    loadPageData();
  }, []);

  useEffect(() => {
    const hasProcessingVideos = videos.some(
      (video) =>
        video.audio_status === "processing" ||
        (video.processing_jobs || []).some(
          (job) =>
            [
              "transcription",
              "content_analysis",
              "script_generation_ai",
            ].includes(job.job_type) && job.status === "processing",
        ),
    );

    if (!hasProcessingVideos) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      refreshVideos();
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [videos]);

  const companyMap = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies],
  );

  const sortedCompanies = useMemo(
    () =>
      [...companies].sort((left, right) =>
        left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
      ),
    [companies],
  );

  const sortedPlatforms = useMemo(() => {
    const uniquePlatforms = new Map();

    videos.forEach((video) => {
      const platform = getPlatformFilterValue(video.platform);
      uniquePlatforms.set(platform, platform);
    });

    return [...uniquePlatforms.values()].sort((left, right) =>
      left.localeCompare(right, "es", { sensitivity: "base" }),
    );
  }, [videos]);

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesCompany =
        !selectedCompanyFilters.length ||
        selectedCompanyFilters.includes(String(video.company_id));
      const matchesPlatform =
        !selectedPlatformFilters.length ||
        selectedPlatformFilters.includes(
          getPlatformFilterValue(video.platform),
        );

      return matchesCompany && matchesPlatform;
    });
  }, [videos, selectedCompanyFilters, selectedPlatformFilters]);

  const summary = useMemo(() => {
    const analyzed = filteredVideos.filter((video) =>
      (video.transcriptions || []).some(
        (transcription) => transcription.analysis_json,
      ),
    ).length;
    const scripted = filteredVideos.filter((video) =>
      (video.script_generations || []).some(
        (generation) => generation.status === "completed",
      ),
    ).length;
    const processing = filteredVideos.filter(
      (video) =>
        video.audio_status === "processing" ||
        (video.processing_jobs || []).some(
          (job) => job.status === "processing",
        ),
    ).length;

    return { total: filteredVideos.length, analyzed, scripted, processing };
  }, [filteredVideos]);

  useEffect(() => {
    setSelectedStageByVideo((current) => {
      const next = {};

      videos.forEach((video) => {
        const latestTranscription = [...(video.transcriptions || [])].sort(
          (left, right) =>
            new Date(right.created_at) - new Date(left.created_at),
        )[0];
        const latestAnalysisJob = [...(video.processing_jobs || [])]
          .filter((job) => job.job_type === "content_analysis")
          .sort(
            (left, right) =>
              new Date(right.created_at) - new Date(left.created_at),
          )[0];
        const latestGenerationJob = [...(video.processing_jobs || [])]
          .filter((job) => job.job_type === "script_generation_ai")
          .sort(
            (left, right) =>
              new Date(right.created_at) - new Date(left.created_at),
          )[0];
        const latestScriptGeneration = [
          ...(video.script_generations || []),
        ].sort(
          (left, right) =>
            new Date(right.created_at) - new Date(left.created_at),
        )[0];
        const analysis = latestTranscription?.analysis_json;
        const isExtracting = video.audio_status === "processing";
        const isTranscribing =
          latestTranscription?.status === "processing" ||
          (video.processing_jobs || []).some(
            (job) =>
              job.job_type === "transcription" && job.status === "processing",
          );
        const isAnalyzing =
          latestAnalysisJob?.status === "processing" ||
          analyzingVideoIds.includes(video.id);
        const isGenerating =
          latestGenerationJob?.status === "processing" ||
          generatingVideoIds.includes(video.id);
        const defaultStage = getDefaultProcessStage({
          hasSource: Boolean(video.original_url),
          isExtracting,
          hasAudio: video.audio_status === "ready",
          isTranscribing,
          hasTranscription: latestTranscription?.status === "completed",
          isAnalyzing,
          hasAnalysis: Boolean(analysis),
          isGenerating,
          hasScript: latestScriptGeneration?.status === "completed",
        });

        next[video.id] = current[video.id] || defaultStage;
      });

      return next;
    });
  }, [videos, analyzingVideoIds, generatingVideoIds]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function openCreateModal() {
    setCreateError("");
    setForm(initialForm);
    setIsCreateModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setCreateError("");

    try {
      await createVideo({
        company_id: Number(form.company_id),
        original_url: form.original_url,
      });
      setForm(initialForm);
      setIsCreateModalOpen(false);
      await loadPageData();
    } catch (requestError) {
      setCreateError(
        requestError.response?.data?.message || "No se pudo crear el video.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExtractAudio(videoId) {
    setActionErrorByVideo((current) => ({ ...current, [videoId]: "" }));
    setExtractingVideoIds((current) => [...new Set([...current, videoId])]);
    try {
      await extractVideoAudio(videoId);
      await refreshVideos();
    } catch (requestError) {
      setActionErrorByVideo((current) => ({
        ...current,
        [videoId]:
          requestError.response?.data?.message ||
          "No se pudo iniciar la extraccion de audio.",
      }));
    } finally {
      setExtractingVideoIds((current) =>
        current.filter((id) => id !== videoId),
      );
    }
  }

  async function handleTranscribeAudio(videoId) {
    setActionErrorByVideo((current) => ({ ...current, [videoId]: "" }));
    setTranscribingVideoIds((current) => [...new Set([...current, videoId])]);
    try {
      await transcribeVideoAudio(videoId);
      await refreshVideos();
    } catch (requestError) {
      setActionErrorByVideo((current) => ({
        ...current,
        [videoId]:
          requestError.response?.data?.message ||
          "No se pudo iniciar la transcripcion.",
      }));
    } finally {
      setTranscribingVideoIds((current) =>
        current.filter((id) => id !== videoId),
      );
    }
  }

  async function handleAnalyzeStructure(videoId) {
    setActionErrorByVideo((current) => ({ ...current, [videoId]: "" }));
    setAnalyzingVideoIds((current) => [...new Set([...current, videoId])]);
    try {
      await analyzeVideoStructure(videoId);
      await refreshVideos();
    } catch (requestError) {
      setActionErrorByVideo((current) => ({
        ...current,
        [videoId]:
          requestError.response?.data?.message ||
          "No se pudo iniciar el analisis.",
      }));
    } finally {
      setAnalyzingVideoIds((current) => current.filter((id) => id !== videoId));
    }
  }

  async function handleGenerateScript(videoId) {
    setActionErrorByVideo((current) => ({ ...current, [videoId]: "" }));
    setGeneratingVideoIds((current) => [...new Set([...current, videoId])]);
    try {
      const campaignId = selectedCampaignByVideo[videoId];
      await generateVideoScript(videoId, {
        campaign_id: campaignId ? Number(campaignId) : null,
      });
      await refreshVideos();
    } catch (requestError) {
      setActionErrorByVideo((current) => ({
        ...current,
        [videoId]:
          requestError.response?.data?.message ||
          "No se pudo iniciar la generacion del guion.",
      }));
    } finally {
      setGeneratingVideoIds((current) =>
        current.filter((id) => id !== videoId),
      );
    }
  }

  const isFilteringByCompany = selectedCompanyFilters.length > 0;
  const isFilteringByPlatform = selectedPlatformFilters.length > 0;
  const emptyStateTitle =
    isFilteringByCompany && isFilteringByPlatform
      ? "No hay videos para esta combinacion de filtros"
      : isFilteringByCompany
        ? "No hay videos para esta empresa"
        : isFilteringByPlatform
          ? "No hay videos para esta plataforma"
          : "Aun no hay videos";
  const emptyStateDescription =
    isFilteringByCompany && isFilteringByPlatform
      ? "Cambia la empresa o la plataforma seleccionada, o registra un video nuevo que cumpla ambas condiciones para iniciar el flujo."
      : isFilteringByCompany
        ? "Cambia el filtro o registra un video nuevo asociado a esta empresa para iniciar el flujo."
        : isFilteringByPlatform
          ? "Cambia el filtro o registra un video nuevo asociado a esta plataforma para iniciar el flujo."
          : "Registra el primer video para iniciar el flujo de audio, transcripcion, analisis y generacion de guiones.";
  const hasActiveFilters = isFilteringByCompany || isFilteringByPlatform;

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-6 pb-10">
      <section className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            Gestion de videos
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Filtra por empresa o plataforma y continua cada video desde su etapa
            actual.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Videos"
              value={summary.total}
              description="Videos registrados."
              dark
            />
            <MetricCard
              label="En proceso"
              value={summary.processing}
              description="Audio, transcripcion, analisis o guion."
            />
            <MetricCard
              label="Con analisis"
              value={summary.analyzed}
              description="Base estructural lista."
            />
            <MetricCard
              label="Con guion"
              value={summary.scripted}
              description="Al menos un guion generado."
            />
          </div>
        </div>
        <Button
          color="primary"
          startContent={<HiOutlinePlus />}
          onPress={openCreateModal}
        >
          Nuevo video
        </Button>
      </section>

      <section>
        <div className="flex flex-wrap items-center gap-3">
          <Popover placement="bottom-start">
            <PopoverTrigger>
              <Button
                variant="flat"
                className="border border-slate-200 bg-slate-50 text-slate-700"
              >
                {getFilterTriggerLabel(
                  "Empresas",
                  selectedCompanyFilters.length,
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-w-sm p-3">
              <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
                {sortedCompanies.map((company) => {
                  const companyId = String(company.id);
                  const isSelected = selectedCompanyFilters.includes(companyId);

                  return (
                    <button
                      key={companyId}
                      type="button"
                      onClick={() =>
                        setSelectedCompanyFilters((current) =>
                          toggleFilterValue(current, companyId),
                        )
                      }
                      className={
                        isSelected
                          ? "cursor-pointer rounded-full bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition"
                          : "cursor-pointer rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                      }
                    >
                      {company.name}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          <Popover placement="bottom-start">
            <PopoverTrigger>
              <Button
                variant="flat"
                className="border border-slate-200 bg-slate-50 text-slate-700"
              >
                {getFilterTriggerLabel(
                  "Plataformas",
                  selectedPlatformFilters.length,
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-w-sm p-3">
              <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
                {sortedPlatforms.map((platform) => {
                  const isSelected = selectedPlatformFilters.includes(platform);

                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() =>
                        setSelectedPlatformFilters((current) =>
                          toggleFilterValue(current, platform),
                        )
                      }
                      className={
                        isSelected
                          ? "cursor-pointer rounded-full bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition"
                          : "cursor-pointer rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                      }
                    >
                      {platform}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setSelectedCompanyFilters([]);
                setSelectedPlatformFilters([]);
              }}
              className="text-sm font-light text-neutral-400 transition hover:text-slate-900 cursor-pointer"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {selectedCompanyFilters.map((companyId) => {
            const company = companies.find(
              (item) => String(item.id) === String(companyId),
            );

            if (!company) {
              return null;
            }

            return (
              <button
                key={`company-${companyId}`}
                type="button"
                onClick={() =>
                  setSelectedCompanyFilters((current) =>
                    current.filter((value) => value !== companyId),
                  )
                }
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700 transition hover:border-sky-200 hover:bg-sky-100"
              >
                <span>{company.name}</span>
                <span className="text-sky-500">×</span>
              </button>
            );
          })}
          {selectedPlatformFilters.map((platform) => (
            <button
              key={`platform-${platform}`}
              type="button"
              onClick={() =>
                setSelectedPlatformFilters((current) =>
                  current.filter((value) => value !== platform),
                )
              }
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 transition hover:border-violet-200 hover:bg-violet-100"
            >
              <span>{platform}</span>
              <span className="text-violet-500">×</span>
            </button>
          ))}
        </div>
      </section>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-slate-500">Cargando videos...</p>
      ) : null}

      {!loading && filteredVideos.length === 0 ? (
        <Card className="border border-dashed border-slate-300 bg-white/70">
          <CardBody className="flex flex-col items-start gap-4 p-8 text-sm leading-7 text-slate-500">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <HiOutlineFilm className="text-2xl" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">
                {emptyStateTitle}
              </p>
              <p className="mt-2 max-w-xl">{emptyStateDescription}</p>
            </div>
            <Button
              color="primary"
              startContent={<HiOutlinePlus />}
              onPress={openCreateModal}
            >
              Crear primer video
            </Button>
          </CardBody>
        </Card>
      ) : null}

      {filteredVideos.length ? (
        <Accordion selectionMode="multiple" variant="splitted" className="px-0">
          {filteredVideos.map((video) => {
            const videoTitle =
              video.source_metadata_json?.title ||
              video.filename ||
              `Video #${video.id}`;
            const companyName =
              companyMap.get(video.company_id)?.name ||
              video.company?.name ||
              "Empresa";
            const creatorName =
              video.creator_name ||
              video.source_metadata_json?.uploader ||
              "Sin creador";
            const platformName = video.platform || "Sin plataforma";
            const latestAudioJob = [...(video.processing_jobs || [])]
              .filter((job) => job.job_type === "audio_extraction")
              .sort(
                (left, right) =>
                  new Date(right.created_at) - new Date(left.created_at),
              )[0];
            const latestTranscriptionJob = [...(video.processing_jobs || [])]
              .filter((job) => job.job_type === "transcription")
              .sort(
                (left, right) =>
                  new Date(right.created_at) - new Date(left.created_at),
              )[0];
            const latestAnalysisJob = [...(video.processing_jobs || [])]
              .filter((job) => job.job_type === "content_analysis")
              .sort(
                (left, right) =>
                  new Date(right.created_at) - new Date(left.created_at),
              )[0];
            const latestGenerationJob = [...(video.processing_jobs || [])]
              .filter((job) => job.job_type === "script_generation_ai")
              .sort(
                (left, right) =>
                  new Date(right.created_at) - new Date(left.created_at),
              )[0];
            const latestTranscription = [...(video.transcriptions || [])].sort(
              (left, right) =>
                new Date(right.created_at) - new Date(left.created_at),
            )[0];
            const latestScriptGeneration = [
              ...(video.script_generations || []),
            ].sort(
              (left, right) =>
                new Date(right.created_at) - new Date(left.created_at),
            )[0];
            const selectedVariant =
              latestScriptGeneration?.variants?.find(
                (variant) => variant.is_selected,
              ) || latestScriptGeneration?.variants?.[0];
            const analysis = latestTranscription?.analysis_json;
            const companyCampaigns = (
              companyMap.get(video.company_id)?.campaigns || []
            ).filter((campaign) => campaign.status !== "archived");
            const isExtracting =
              extractingVideoIds.includes(video.id) ||
              video.audio_status === "processing";
            const isTranscribing =
              transcribingVideoIds.includes(video.id) ||
              latestTranscriptionJob?.status === "processing";
            const isAnalyzing =
              analyzingVideoIds.includes(video.id) ||
              latestAnalysisJob?.status === "processing";
            const isGenerating =
              generatingVideoIds.includes(video.id) ||
              latestGenerationJob?.status === "processing";
            const pipelineStage = getPipelineStage({
              video,
              latestTranscription,
              latestAnalysisJob,
              latestScriptGeneration,
            });
            const hasSource = Boolean(video.original_url);
            const hasAudio = video.audio_status === "ready";
            const hasTranscription =
              latestTranscription?.status === "completed";
            const hasAnalysis = Boolean(analysis);
            const hasScript = latestScriptGeneration?.status === "completed";
            const defaultStage = getDefaultProcessStage({
              hasSource,
              isExtracting,
              hasAudio,
              isTranscribing,
              hasTranscription,
              isAnalyzing,
              hasAnalysis,
              isGenerating,
              hasScript,
            });
            const stageItems = [
              {
                key: "audio",
                label: "Audio",
                description: hasAudio
                  ? "Audio extraido"
                  : isExtracting
                    ? "Extrayendo audio"
                    : "Pendiente",
                isAccessible: hasSource,
                status: getStageStatus(
                  hasAudio,
                  hasSource && (isExtracting || !hasAudio),
                ),
              },
              {
                key: "transcription",
                label: "Transcripcion",
                description: hasTranscription
                  ? "Texto listo"
                  : isTranscribing
                    ? "Transcribiendo"
                    : "Pendiente",
                isAccessible: hasAudio,
                status: getStageStatus(
                  hasTranscription,
                  hasAudio && (isTranscribing || !hasTranscription),
                ),
              },
              {
                key: "analysis",
                label: "Analisis",
                description: analysis
                  ? "Estructura lista"
                  : isAnalyzing
                    ? "Analizando"
                    : "Pendiente",
                isAccessible: hasTranscription,
                status: getStageStatus(
                  Boolean(analysis),
                  hasTranscription && (isAnalyzing || !hasAnalysis),
                ),
              },
              {
                key: "script",
                label: "Guion",
                description:
                  latestScriptGeneration?.status === "completed"
                    ? "Guion generado"
                    : isGenerating
                      ? "Generando"
                      : "Pendiente",
                isAccessible: hasAnalysis,
                status: getStageStatus(
                  hasScript,
                  hasAnalysis && (isGenerating || !hasScript),
                ),
              },
            ];
            const activeStage = stageItems.some(
              (stage) =>
                stage.key === selectedStageByVideo[video.id] &&
                stage.isAccessible,
            )
              ? selectedStageByVideo[video.id]
              : defaultStage;

            return (
              <AccordionItem
                key={String(video.id)}
                aria-label={videoTitle}
                classNames={{
                  base: "rounded-[1.75rem] border border-slate-200/80 bg-white/90 px-0 shadow-sm shadow-slate-200/40",
                  trigger: "cursor-pointer px-6 py-5 hover:bg-slate-50/80",
                  title: "text-left",
                  content: "px-6 pb-6 pt-0",
                }}
                title={
                  <div className="min-w-0 max-w-full">
                    <div className="flex items-center gap-2">
                      {video.original_url ? (
                        <Tooltip
                          content="Ver video original"
                          placement="left"
                          showArrow
                          delay={150}
                        >
                          <a
                            href={video.original_url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Abrir fuente original"
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700 transition duration-200 hover:cursor-pointer hover:border-sky-300 hover:bg-sky-100 motion-safe:hover:-translate-y-0.5"
                          >
                            <HiOutlineExternalLink className="text-lg" />
                          </a>
                        </Tooltip>
                      ) : null}
                      <p className="truncate text-xl font-semibold tracking-tight text-slate-950">
                        {videoTitle}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                      <div className="flex min-w-0 items-center gap-2">
                        <HiOutlineVideoCamera className="shrink-0 text-base text-slate-400" />
                        <span className="truncate">{platformName}</span>
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <HiOutlineUserCircle className="shrink-0 text-base text-slate-400" />
                        <span className="truncate">{creatorName}</span>
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <HiOutlineClock className="shrink-0 text-base text-slate-400" />
                        <span className="truncate">
                          {formatDuration(video.duration_seconds)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-slate-400">
                      <HiOutlineBuildingOffice2 className="shrink-0 text-base text-slate-400" />
                      <span className="truncate">{companyName}</span>
                    </div>
                  </div>
                }
                subtitle={
                  <div className="mt-3 flex min-w-0 max-w-full flex-wrap items-center gap-2 overflow-hidden text-sm text-slate-500">
                    <span className="shrink-0">{video.status}</span>
                    <span className="text-slate-300">·</span>
                    <span className="shrink-0">{pipelineStage}</span>
                    <span className="text-slate-300">·</span>
                    <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                      {latestScriptGeneration
                        ? "Con guion generado"
                        : "Sin guion generado"}
                    </span>
                  </div>
                }
              >
                <div className="space-y-6">
                  <section className="rounded-3xl border border-slate-200/80 bg-slate-50/60 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <HiOutlineFilm className="text-lg text-sky-600" />
                        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Flujo del video
                        </h3>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {stageItems.map((stage, index) => {
                        const isCompleted = stage.status === "completed";
                        const isCurrent = stage.status === "current";
                        const isActive = activeStage === stage.key;
                        const isDisabled = !stage.isAccessible;

                        return (
                          <button
                            key={stage.key}
                            type="button"
                            onClick={() => {
                              if (isDisabled) return;
                              setSelectedStageByVideo((current) => ({
                                ...current,
                                [video.id]: stage.key,
                              }));
                            }}
                            disabled={isDisabled}
                            className={
                              isActive
                                ? "relative overflow-hidden rounded-2xl border border-slate-950 bg-slate-950 px-4 py-4 text-left text-white transition duration-200 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-lg"
                                : isCompleted
                                  ? "relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 text-left transition duration-200 hover:cursor-pointer hover:border-emerald-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-md"
                                  : isCurrent
                                    ? "relative overflow-hidden rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-4 text-left transition duration-200 hover:cursor-pointer hover:border-sky-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-md"
                                    : isDisabled
                                      ? "relative overflow-hidden rounded-2xl border border-slate-200 bg-white/60 px-4 py-4 text-left opacity-60"
                                      : "relative overflow-hidden rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 text-left transition duration-200 hover:cursor-pointer hover:border-slate-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-md"
                            }
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={
                                  isActive
                                    ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-950"
                                    : isCompleted
                                      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white"
                                      : isCurrent
                                        ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-semibold text-white"
                                        : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600"
                                }
                              >
                                {index + 1}
                              </div>
                              <div className="min-w-0">
                                <p
                                  className={
                                    isActive
                                      ? "text-xs uppercase tracking-[0.24em] text-slate-300"
                                      : isCompleted
                                        ? "text-xs uppercase tracking-[0.24em] text-emerald-700"
                                        : isCurrent
                                          ? "text-xs uppercase tracking-[0.24em] text-sky-700"
                                          : "text-xs uppercase tracking-[0.24em] text-slate-400"
                                  }
                                >
                                  {stage.label}
                                </p>
                                <p
                                  className={
                                    isActive
                                      ? "mt-1 text-sm font-medium text-white"
                                      : "mt-1 text-sm font-medium text-slate-900"
                                  }
                                >
                                  {stage.description}
                                </p>
                              </div>
                            </div>
                            {index < stageItems.length - 1 ? (
                              <div
                                className={
                                  isActive
                                    ? "mt-4 h-1 w-full rounded-full bg-white/30"
                                    : isCompleted
                                      ? "mt-4 h-1 w-full rounded-full bg-emerald-200"
                                      : isCurrent
                                        ? "mt-4 h-1 w-full rounded-full bg-sky-200"
                                        : "mt-4 h-1 w-full rounded-full bg-slate-200"
                                }
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {activeStage === "audio" ? (
                    <section className="rounded-3xl border border-slate-200/80 bg-slate-50/60 p-5">
                      <div className="flex items-center gap-2">
                        <HiOutlineFilm className="text-lg text-sky-600" />
                        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Extraccion de audio
                        </h3>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Button
                          color="primary"
                          variant={
                            video.audio_status === "ready" ? "flat" : "solid"
                          }
                          isLoading={extractingVideoIds.includes(video.id)}
                          isDisabled={!video.original_url || isExtracting}
                          onPress={() => handleExtractAudio(video.id)}
                        >
                          {video.audio_status === "ready"
                            ? "Reextraer audio"
                            : "Extraer audio"}
                        </Button>
                      </div>

                      {!video.original_url ? (
                        <p className="mt-3 text-sm text-slate-500">
                          Este video no tiene URL publica. La extraccion solo
                          funciona con links.
                        </p>
                      ) : null}
                      {latestAudioJob?.error_message ? (
                        <p className="mt-3 text-sm text-danger">
                          {latestAudioJob.error_message}
                        </p>
                      ) : null}
                      {actionErrorByVideo[video.id] ? (
                        <p className="mt-3 text-sm text-danger">
                          {actionErrorByVideo[video.id]}
                        </p>
                      ) : null}
                    </section>
                  ) : null}

                  {activeStage === "transcription" ? (
                    <section className="rounded-3xl border border-slate-200/80 bg-slate-50/60 p-5">
                      <div className="flex items-center gap-2">
                        <HiOutlineDocumentText className="text-lg text-violet-600" />
                        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Transcripcion
                        </h3>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm leading-7 text-slate-600">
                          {latestTranscriptionJob
                            ? `${latestTranscriptionJob.status} · ${latestTranscriptionJob.progress}%`
                            : "Aun no se ha lanzado la transcripcion"}
                        </p>
                        <Button
                          color="secondary"
                          variant={
                            latestTranscription?.status === "completed"
                              ? "flat"
                              : "solid"
                          }
                          isLoading={transcribingVideoIds.includes(video.id)}
                          isDisabled={
                            video.audio_status !== "ready" || isTranscribing
                          }
                          onPress={() => handleTranscribeAudio(video.id)}
                        >
                          {latestTranscription?.status === "completed"
                            ? "Retraducir a texto"
                            : "Transcribir audio"}
                        </Button>
                      </div>
                      {video.audio_status !== "ready" ? (
                        <p className="mt-3 text-sm text-slate-500">
                          Primero necesitas tener el audio listo para poder
                          transcribirlo.
                        </p>
                      ) : null}
                      {latestTranscription ? (
                        <div className="mt-4 space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                Estado
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-700">
                                {latestTranscription.status}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                Idioma
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-700">
                                {latestTranscription.language || "No detectado"}
                              </p>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                              Texto transcrito
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                              {latestTranscription.raw_text ||
                                "Sin texto disponible todavia"}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {activeStage === "analysis" ? (
                    <section className="rounded-3xl border border-slate-200/80 bg-slate-50/60 p-5">
                      <div className="flex items-center gap-2">
                        <HiOutlineSparkles className="text-lg text-amber-600" />
                        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Analisis
                        </h3>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm leading-7 text-slate-600">
                          {latestAnalysisJob
                            ? `${latestAnalysisJob.status} · ${latestAnalysisJob.progress}%`
                            : "Aun no se ha lanzado el analisis"}
                        </p>
                        <Button
                          color="warning"
                          variant={analysis ? "flat" : "solid"}
                          isLoading={analyzingVideoIds.includes(video.id)}
                          isDisabled={!latestTranscription || isAnalyzing}
                          onPress={() => handleAnalyzeStructure(video.id)}
                        >
                          {analysis
                            ? "Reanalizar estructura"
                            : "Analizar estructura"}
                        </Button>
                      </div>
                      {!latestTranscription ? (
                        <p className="mt-3 text-sm text-slate-500">
                          Primero necesitas una transcripcion completada para
                          poder analizarla.
                        </p>
                      ) : null}
                      {latestAnalysisJob?.error_message ? (
                        <p className="mt-3 text-sm text-danger">
                          {latestAnalysisJob.error_message}
                        </p>
                      ) : null}

                      {analysis ? (
                        <div className="mt-4 space-y-4">
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                Hook
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-700">
                                {analysis.hook || "Sin hook"}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                Angulo
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-700">
                                {analysis.content_angle ||
                                  "Sin angulo identificado"}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                Audience trigger
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-700">
                                {analysis.audience_trigger ||
                                  "Sin trigger identificado"}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                Mensaje principal
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-700">
                                {analysis.main_message_summary || "Sin resumen"}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                CTA
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-700">
                                {analysis.cta || "Sin CTA"}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                              Desarrollo
                            </p>
                            <p className="mt-2 text-sm leading-7 text-slate-700">
                              {analysis.development ||
                                "Sin desarrollo identificado"}
                            </p>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                Por que funciona
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-700">
                                {analysis.why_it_works || "Sin explicacion"}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                Insight
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-700">
                                {analysis.insight || "Sin insight"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {activeStage === "script" ? (
                    <section className="rounded-3xl border border-slate-200/80 bg-slate-50/60 p-5">
                      <div className="flex items-center gap-2">
                        <HiOutlineSparkles className="text-lg text-emerald-600" />
                        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Guion
                        </h3>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm leading-7 text-slate-600">
                          {latestGenerationJob
                            ? `${latestGenerationJob.status} · ${latestGenerationJob.progress}%`
                            : "Aun no se ha lanzado la generacion"}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          <Select
                            aria-label={`Campana para video ${video.id}`}
                            placeholder="Campana opcional"
                            selectedKeys={
                              selectedCampaignByVideo[video.id]
                                ? [selectedCampaignByVideo[video.id]]
                                : []
                            }
                            onSelectionChange={(keys) => {
                              const value = Array.from(keys)[0];
                              setSelectedCampaignByVideo((current) => ({
                                ...current,
                                [video.id]: value || "",
                              }));
                            }}
                            className="min-w-56"
                            isDisabled={!companyCampaigns.length}
                          >
                            {companyCampaigns.map((campaign) => (
                              <SelectItem key={String(campaign.id)}>
                                {campaign.name}
                              </SelectItem>
                            ))}
                          </Select>
                          <Button
                            color="success"
                            isLoading={generatingVideoIds.includes(video.id)}
                            isDisabled={!analysis || isGenerating}
                            onPress={() => handleGenerateScript(video.id)}
                          >
                            Generar guion
                          </Button>
                        </div>
                      </div>
                      {!analysis ? (
                        <p className="mt-3 text-sm text-slate-500">
                          Primero analiza la estructura del contenido antes de
                          generar un guion nuevo.
                        </p>
                      ) : null}
                      {latestGenerationJob?.error_message ? (
                        <p className="mt-3 text-sm text-danger">
                          {latestGenerationJob.error_message}
                        </p>
                      ) : null}

                      {latestScriptGeneration ? (
                        <div className="mt-4 space-y-4">
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                Version
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-700">
                                v{latestScriptGeneration.version}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                Estado
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-700">
                                {latestScriptGeneration.status}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                Campana
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-700">
                                {latestScriptGeneration.campaign?.name ||
                                  "Sin campana"}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                Hook
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-700">
                                {latestScriptGeneration.hook || "Sin hook"}
                              </p>
                            </div>
                          </div>

                          {selectedVariant ? (
                            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                Variante seleccionada
                              </p>
                              <p className="mt-2 text-base font-medium text-slate-900">
                                {selectedVariant.title || "Sin titulo"}
                              </p>
                              <p className="mt-2 text-sm text-slate-500">
                                {selectedVariant.angle || "Sin angulo definido"}
                              </p>
                              <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                    Hook variante
                                  </p>
                                  <p className="mt-2 text-sm leading-7 text-slate-700">
                                    {selectedVariant.hook || "Sin hook"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                    CTA variante
                                  </p>
                                  <p className="mt-2 text-sm leading-7 text-slate-700">
                                    {selectedVariant.cta || "Sin CTA"}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-4">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                  Body variante
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                                  {selectedVariant.body || "Sin body"}
                                </p>
                              </div>
                            </div>
                          ) : null}

                          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                              Guion completo
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                              {latestScriptGeneration.generated_script ||
                                "Sin guion generado todavia"}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                </div>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : null}

      <Modal
        isOpen={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent className="max-h-[85vh]">
          {(onClose) => (
            <form
              onSubmit={handleSubmit}
              className="flex h-full flex-col overflow-hidden"
            >
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-2xl font-semibold text-slate-950">
                  Nuevo video
                </span>
                <span className="text-sm font-normal text-slate-500">
                  Asocialo a una empresa y define la fuente de entrada.
                </span>
              </ModalHeader>
              <ModalBody className="grid min-h-0 flex-1 gap-4 overflow-y-auto pb-2">
                <Select
                  label="Empresa"
                  selectedKeys={form.company_id ? [form.company_id] : []}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0];
                    setForm((current) => ({
                      ...current,
                      company_id: value || "",
                    }));
                  }}
                  isRequired
                >
                  {companies.map((company) => (
                    <SelectItem key={String(company.id)}>
                      {company.name}
                    </SelectItem>
                  ))}
                </Select>
                <Input
                  label="URL original"
                  name="original_url"
                  value={form.original_url}
                  onChange={handleChange}
                  placeholder="https://..."
                  description="El sistema extrae automaticamente titulo, creador, plataforma y duracion."
                  isRequired
                />
                {createError ? (
                  <p className="text-sm text-danger">{createError}</p>
                ) : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button color="primary" type="submit" isLoading={submitting}>
                  Crear video
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
