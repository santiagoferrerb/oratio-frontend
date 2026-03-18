import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardBody, Input, Select, SelectItem } from "@heroui/react";
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
  source_type: "url",
  original_url: "",
  file_path: "",
  filename: "",
  platform: "",
  duration_seconds: "",
  status: "pending",
};

const statusOptions = ["pending", "processing", "ready", "failed"];
const sourceOptions = ["url", "upload", "manual"];

export default function VideosPage() {
  const [videos, setVideos] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [actionErrorByVideo, setActionErrorByVideo] = useState({});
  const [extractingVideoIds, setExtractingVideoIds] = useState([]);
  const [transcribingVideoIds, setTranscribingVideoIds] = useState([]);
  const [analyzingVideoIds, setAnalyzingVideoIds] = useState([]);
  const [generatingVideoIds, setGeneratingVideoIds] = useState([]);

  async function loadPageData() {
    setLoading(true);
    setError("");

    try {
      const [{ companies: nextCompanies }, { videos: nextVideos }] = await Promise.all([
        getCompanies(),
        getVideos(),
      ]);
      setCompanies(nextCompanies);
      setVideos(nextVideos);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No se pudieron cargar los videos.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshVideos() {
    try {
      const [{ companies: nextCompanies }, { videos: nextVideos }] = await Promise.all([
        getCompanies(),
        getVideos(),
      ]);
      setCompanies(nextCompanies);
      setVideos(nextVideos);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No se pudieron cargar los videos.");
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
            ["transcription", "content_analysis", "script_generation_ai"].includes(
              job.job_type,
            ) && job.status === "processing",
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

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await createVideo({
        company_id: Number(form.company_id),
        source_type: form.source_type,
        original_url: form.original_url || null,
        file_path: form.file_path || null,
        filename: form.filename || null,
        platform: form.platform || null,
        duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : null,
        status: form.status,
      });
      setForm(initialForm);
      await loadPageData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No se pudo crear el video.");
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
          requestError.response?.data?.message || "No se pudo iniciar la extraccion de audio.",
      }));
    } finally {
      setExtractingVideoIds((current) => current.filter((id) => id !== videoId));
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
          requestError.response?.data?.message || "No se pudo iniciar la transcripcion.",
      }));
    } finally {
      setTranscribingVideoIds((current) => current.filter((id) => id !== videoId));
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
          requestError.response?.data?.message || "No se pudo iniciar el analisis.",
      }));
    } finally {
      setAnalyzingVideoIds((current) => current.filter((id) => id !== videoId));
    }
  }

  async function handleGenerateScript(videoId) {
    setActionErrorByVideo((current) => ({ ...current, [videoId]: "" }));
    setGeneratingVideoIds((current) => [...new Set([...current, videoId])]);

    try {
      await generateVideoScript(videoId);
      await refreshVideos();
    } catch (requestError) {
      setActionErrorByVideo((current) => ({
        ...current,
        [videoId]:
          requestError.response?.data?.message || "No se pudo iniciar la generacion del guion.",
      }));
    } finally {
      setGeneratingVideoIds((current) => current.filter((id) => id !== videoId));
    }
  }

  const companyMap = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies],
  );

  return (
    <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-8 pb-10">
      <section>
        <p className="text-xs uppercase tracking-[0.35em] text-sky-600">Videos</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          Fuentes para procesar
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Registra referencias por empresa para luego transcribir, analizar y convertir en guiones.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="border border-slate-200/80 bg-white/80 shadow-lg shadow-slate-200/50">
          <CardBody className="p-6">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Nuevo video</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Asocialo a una empresa y define la fuente de entrada.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <Select
                label="Empresa"
                selectedKeys={form.company_id ? [form.company_id] : []}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0];
                  setForm((current) => ({ ...current, company_id: value || "" }));
                }}
                isRequired
              >
                {companies.map((company) => (
                  <SelectItem key={String(company.id)}>{company.name}</SelectItem>
                ))}
              </Select>

              <Select
                label="Tipo de fuente"
                selectedKeys={[form.source_type]}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0];
                  setForm((current) => ({ ...current, source_type: value || "url" }));
                }}
              >
                {sourceOptions.map((option) => (
                  <SelectItem key={option}>{option}</SelectItem>
                ))}
              </Select>

              <Input
                label="URL original"
                name="original_url"
                value={form.original_url}
                onChange={handleChange}
                placeholder="https://..."
              />
              <Input
                label="Ruta de archivo"
                name="file_path"
                value={form.file_path}
                onChange={handleChange}
              />
              <Input label="Nombre archivo" name="filename" value={form.filename} onChange={handleChange} />
              <Input label="Plataforma" name="platform" value={form.platform} onChange={handleChange} />
              <Input
                label="Duracion en segundos"
                name="duration_seconds"
                type="number"
                value={form.duration_seconds}
                onChange={handleChange}
              />
              <Select
                label="Estado"
                selectedKeys={[form.status]}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0];
                  setForm((current) => ({ ...current, status: value || "pending" }));
                }}
              >
                {statusOptions.map((option) => (
                  <SelectItem key={option}>{option}</SelectItem>
                ))}
              </Select>

              {error ? <p className="text-sm text-danger">{error}</p> : null}

              <Button color="primary" type="submit" fullWidth isLoading={submitting}>
                Crear video
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Listado</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Videos registrados
              </h2>
            </div>
            <Button variant="light" onPress={loadPageData} isLoading={loading}>
              Recargar
            </Button>
          </div>

          {loading ? <p className="text-sm text-slate-500">Cargando videos...</p> : null}

          {!loading && videos.length === 0 ? (
            <Card className="border border-dashed border-slate-300 bg-white/70">
              <CardBody className="p-6 text-sm leading-7 text-slate-500">
                Aun no hay videos. Primero crea una empresa y luego registra su primera referencia.
              </CardBody>
            </Card>
          ) : null}

          {videos.map((video) => {
            const latestAudioJob = [...(video.processing_jobs || [])]
              .filter((job) => job.job_type === "audio_extraction")
              .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))[0];
            const latestTranscriptionJob = [...(video.processing_jobs || [])]
              .filter((job) => job.job_type === "transcription")
              .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))[0];
            const latestAnalysisJob = [...(video.processing_jobs || [])]
              .filter((job) => job.job_type === "content_analysis")
              .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))[0];
            const latestGenerationJob = [...(video.processing_jobs || [])]
              .filter((job) => job.job_type === "script_generation_ai")
              .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))[0];
            const latestTranscription = [...(video.transcriptions || [])].sort(
              (left, right) => new Date(right.created_at) - new Date(left.created_at),
            )[0];
            const latestScriptGeneration = [...(video.script_generations || [])].sort(
              (left, right) => new Date(right.created_at) - new Date(left.created_at),
            )[0];
            const selectedVariant =
              latestScriptGeneration?.variants?.find((variant) => variant.is_selected) ||
              latestScriptGeneration?.variants?.[0];
            const analysis = latestTranscription?.analysis_json;
            const isExtracting =
              extractingVideoIds.includes(video.id) || video.audio_status === "processing";
            const isTranscribing =
              transcribingVideoIds.includes(video.id) ||
              latestTranscriptionJob?.status === "processing";
            const isAnalyzing =
              analyzingVideoIds.includes(video.id) ||
              latestAnalysisJob?.status === "processing";
            const isGenerating =
              generatingVideoIds.includes(video.id) ||
              latestGenerationJob?.status === "processing";

            return (
            <Card
              key={video.id}
              className="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-200/40"
            >
              <CardBody className="gap-4 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight truncate max-w-md text-slate-950">
                      {video.filename || video.original_url || `Video #${video.id}`}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {companyMap.get(video.company_id)?.name || video.company?.name || "Empresa"}
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">
                    {video.status}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Fuente</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {video.original_url || video.file_path || "Sin origen"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Plataforma</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {video.platform || "No definida"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Duracion</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {video.duration_seconds ? `${video.duration_seconds}s` : "No registrada"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                      Transcripciones
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {video.transcriptions?.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                      Audio
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {video.audio_status || "pending"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                      Archivo de audio
                    </p>
                    <p className="mt-2 break-all text-sm leading-7 text-slate-600">
                      {video.audio_path || "Aun no generado"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                        Extraccion local
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {latestAudioJob
                          ? `${latestAudioJob.status} · ${latestAudioJob.progress}%`
                          : "Aun no se ha lanzado la extraccion"}
                      </p>
                    </div>
                    <Button
                      color="primary"
                      variant={video.audio_status === "ready" ? "flat" : "solid"}
                      isLoading={extractingVideoIds.includes(video.id)}
                      isDisabled={!video.original_url || isExtracting}
                      onPress={() => handleExtractAudio(video.id)}
                    >
                      {video.audio_status === "ready" ? "Reextraer audio" : "Extraer audio"}
                    </Button>
                  </div>

                  {!video.original_url ? (
                    <p className="mt-3 text-sm text-slate-500">
                      Este video no tiene URL publica. La extraccion solo funciona con links.
                    </p>
                  ) : null}

                  {latestAudioJob?.error_message ? (
                    <p className="mt-3 text-sm text-danger">{latestAudioJob.error_message}</p>
                  ) : null}

                  {actionErrorByVideo[video.id] ? (
                    <p className="mt-3 text-sm text-danger">{actionErrorByVideo[video.id]}</p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                        Transcripcion
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {latestTranscriptionJob
                          ? `${latestTranscriptionJob.status} · ${latestTranscriptionJob.progress}%`
                          : "Aun no se ha lanzado la transcripcion"}
                      </p>
                    </div>
                    <Button
                      color="secondary"
                      variant={latestTranscription?.status === "completed" ? "flat" : "solid"}
                      isLoading={transcribingVideoIds.includes(video.id)}
                      isDisabled={video.audio_status !== "ready" || isTranscribing}
                      onPress={() => handleTranscribeAudio(video.id)}
                    >
                      {latestTranscription?.status === "completed"
                        ? "Retraducir a texto"
                        : "Transcribir audio"}
                    </Button>
                  </div>

                  {video.audio_status !== "ready" ? (
                    <p className="mt-3 text-sm text-slate-500">
                      Primero necesitas tener el audio listo para poder transcribirlo.
                    </p>
                  ) : null}

                  {latestTranscriptionJob?.error_message ? (
                    <p className="mt-3 text-sm text-danger">
                      {latestTranscriptionJob.error_message}
                    </p>
                  ) : null}

                  {latestTranscription ? (
                    <div className="mt-4 space-y-3">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                            Estado
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {latestTranscription.status}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                            Idioma
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {latestTranscription.language || "No detectado"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                          Texto transcrito
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                          {latestTranscription.raw_text || "Sin texto disponible todavia"}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                        Analisis de estructura
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {latestAnalysisJob
                          ? `${latestAnalysisJob.status} · ${latestAnalysisJob.progress}%`
                          : "Aun no se ha lanzado el analisis"}
                      </p>
                    </div>
                    <Button
                      color="warning"
                      variant={analysis ? "flat" : "solid"}
                      isLoading={analyzingVideoIds.includes(video.id)}
                      isDisabled={!latestTranscription || isAnalyzing}
                      onPress={() => handleAnalyzeStructure(video.id)}
                    >
                      {analysis ? "Reanalizar estructura" : "Analizar estructura"}
                    </Button>
                  </div>

                  {!latestTranscription ? (
                    <p className="mt-3 text-sm text-slate-500">
                      Primero necesitas una transcripcion completada para poder analizarla.
                    </p>
                  ) : null}

                  {latestAnalysisJob?.error_message ? (
                    <p className="mt-3 text-sm text-danger">
                      {latestAnalysisJob.error_message}
                    </p>
                  ) : null}

                  {analysis ? (
                    <div className="mt-4 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                            Hook
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {analysis.hook}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                            Mensaje principal
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {analysis.main_message_summary}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                            Insight
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {analysis.insight}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                            CTA
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {analysis.cta}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                          Por que funciona
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {analysis.why_it_works}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                          Claims detectados
                        </p>
                        <div className="mt-2 space-y-3">
                          {(analysis.claims_detected || []).map((claim, index) => (
                            <div
                              key={`${video.id}-claim-${index}`}
                              className="rounded-xl border border-slate-200 bg-white/70 p-3"
                            >
                              <p className="text-sm font-medium text-slate-900">{claim.claim}</p>
                              <p className="mt-1 text-sm text-slate-600">
                                {claim.assessment} · {claim.reason}
                              </p>
                              {(claim.evidence || []).map((evidence, evidenceIndex) => (
                                <p
                                  key={`${video.id}-claim-${index}-evidence-${evidenceIndex}`}
                                  className="mt-2 text-xs text-slate-500"
                                >
                                  {evidence.source}: {evidence.title}
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                        Generacion de guion
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {latestGenerationJob
                          ? `${latestGenerationJob.status} · ${latestGenerationJob.progress}%`
                          : "Aun no se ha lanzado la generacion"}
                      </p>
                    </div>
                    <Button
                      color="success"
                      isLoading={generatingVideoIds.includes(video.id)}
                      isDisabled={!analysis || isGenerating}
                      onPress={() => handleGenerateScript(video.id)}
                    >
                      Generar guion
                    </Button>
                  </div>

                  {!analysis ? (
                    <p className="mt-3 text-sm text-slate-500">
                      Primero analiza la estructura del contenido antes de generar un guion nuevo.
                    </p>
                  ) : null}

                  {latestGenerationJob?.error_message ? (
                    <p className="mt-3 text-sm text-danger">
                      {latestGenerationJob.error_message}
                    </p>
                  ) : null}

                  {latestScriptGeneration ? (
                    <div className="mt-4 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                            Version
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            v{latestScriptGeneration.version}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                            Estado
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {latestScriptGeneration.status}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                            Hook
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {latestScriptGeneration.hook || "Sin hook"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                            CTA
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {latestScriptGeneration.cta || "Sin CTA"}
                          </p>
                        </div>
                      </div>

                      {selectedVariant ? (
                        <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
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
                              <p className="mt-2 text-sm leading-7 text-slate-600">
                                {selectedVariant.hook || "Sin hook"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                CTA variante
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-600">
                                {selectedVariant.cta || "Sin CTA"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                              Body variante
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                              {selectedVariant.body || "Sin body"}
                            </p>
                          </div>
                        </div>
                      ) : null}

                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                          Guion completo
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                          {latestScriptGeneration.generated_script || "Sin guion generado todavia"}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardBody>
            </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
