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
  Select,
  SelectItem,
} from "@heroui/react";
import {
  HiOutlineBuildingOffice2,
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
          ? "rounded-3xl bg-slate-950 px-5 py-4 text-white"
          : "rounded-3xl border border-slate-200 bg-white px-5 py-4"
      }
    >
      <p className={dark ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
        {label}
      </p>
      <strong
        className={
          dark
            ? "mt-2 block text-3xl font-semibold"
            : "mt-2 block text-3xl font-semibold text-slate-950"
        }
      >
        {value}
      </strong>
      <p
        className={
          dark ? "mt-1 text-sm text-slate-300" : "mt-1 text-sm text-slate-500"
        }
      >
        {description}
      </p>
    </div>
  );
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

  const summary = useMemo(() => {
    const analyzed = videos.filter((video) =>
      (video.transcriptions || []).some(
        (transcription) => transcription.analysis_json,
      ),
    ).length;
    const scripted = videos.filter((video) =>
      (video.script_generations || []).some(
        (generation) => generation.status === "completed",
      ),
    ).length;
    const processing = videos.filter(
      (video) =>
        video.audio_status === "processing" ||
        (video.processing_jobs || []).some(
          (job) => job.status === "processing",
        ),
    ).length;

    return { total: videos.length, analyzed, scripted, processing };
  }, [videos]);

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

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-8 pb-10">
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-sky-600">
            Videos
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            Fuentes para procesar
          </h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Prioriza los videos ya creados, revisa en que etapa estan y continua
            cada flujo hasta llegar a transcripcion, analisis y guion.
          </p>
        </div>
        <Button
          color="primary"
          startContent={<HiOutlinePlus />}
          onPress={openCreateModal}
        >
          Nuevo video
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Videos"
          value={summary.total}
          description="Referencias registradas."
          dark
        />
        <MetricCard
          label="En proceso"
          value={summary.processing}
          description="Items corriendo audio, transcripcion, analisis o guion."
        />
        <MetricCard
          label="Con analisis"
          value={summary.analyzed}
          description="Videos listos para usar como base estructural."
        />
        <MetricCard
          label="Con guion"
          value={summary.scripted}
          description="Videos que ya produjeron al menos un guion."
        />
      </section>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-slate-500">Cargando videos...</p>
      ) : null}

      {!loading && videos.length === 0 ? (
        <Card className="border border-dashed border-slate-300 bg-white/70">
          <CardBody className="flex flex-col items-start gap-4 p-8 text-sm leading-7 text-slate-500">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <HiOutlineFilm className="text-2xl" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">
                Aun no hay videos
              </p>
              <p className="mt-2 max-w-xl">
                Registra el primer video para iniciar el flujo de audio,
                transcripcion, analisis y generacion de guiones.
              </p>
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

      {videos.length ? (
        <Accordion selectionMode="multiple" variant="splitted" className="px-0">
          {videos.map((video) => {
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
                    <p className="truncate text-xl font-semibold tracking-tight text-slate-950">
                      {videoTitle}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                      <div className="flex min-w-0 items-center gap-2">
                        <HiOutlineVideoCamera className="shrink-0 text-base text-slate-400" />
                        <span className="truncate">{platformName}</span>
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <HiOutlineUserCircle className="shrink-0 text-base text-slate-400" />
                        <span className="truncate">{creatorName}</span>
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
                  <section className="border border-slate-200/80 bg-slate-50/60 p-5">
                    <div className="flex items-center gap-2">
                      <HiOutlineFilm className="text-lg text-sky-600" />
                      <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Resumen
                      </h3>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                          <span className="inline-flex items-center gap-2">
                            <span>Origen</span>
                            {video.original_url ? (
                              <a
                                href={video.original_url}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Abrir enlace original del video"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary transition hover:border-primary/35 hover:bg-primary/10"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  className="h-3.5 w-3.5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 13.5V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18v-7.5A1.5 1.5 0 0 1 6 9h4.5"
                                  />
                                </svg>
                              </a>
                            ) : null}
                          </span>
                        </p>
                        {video.original_url ? (
                          <Button
                            as="a"
                            href={video.original_url}
                            target="_blank"
                            rel="noreferrer"
                            size="sm"
                            variant="light"
                            startContent={
                              <HiOutlineExternalLink className="text-base" />
                            }
                            className="mt-2 w-fit"
                          >
                            Abrir enlace
                          </Button>
                        ) : (
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            Sin origen
                          </p>
                        )}
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                          Plataforma
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {video.platform || "No definida"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                          Creador
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {video.creator_name ||
                            video.source_metadata_json?.uploader ||
                            "No detectado"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                          Duracion
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {video.duration_seconds
                            ? `${video.duration_seconds}s`
                            : "No registrada"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                          Audio
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {video.audio_status || "pending"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                          Archivo de audio
                        </p>
                        <p className="mt-2 break-all text-sm leading-6 text-slate-700">
                          {video.audio_path || "Aun no generado"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                          Transcripciones
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {video.transcriptions?.length || 0}
                        </p>
                      </div>
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

                  <section className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/60 p-5">
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

                  <section className=" border border-slate-200/80 bg-slate-50/60 p-5">
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

                  <section className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/60 p-5">
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
