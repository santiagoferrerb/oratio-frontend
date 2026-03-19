import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Textarea,
} from "@heroui/react";
import { getCompanies } from "../services/companyService";
import { createScriptGeneration, getScriptGenerations } from "../services/scriptGenerationService";
import { getVideos } from "../services/videoService";

const initialForm = {
  company_id: "",
  campaign_id: "",
  video_id: "",
  original_script: "",
  generated_script: "",
  hook: "",
  cta: "",
  status: "draft",
  version: "1",
  variant_title: "",
  variant_angle: "",
  variant_platform: "",
  variant_duration_target: "",
  variant_hook: "",
  variant_body: "",
  variant_cta: "",
};

export default function ScriptGenerationsPage() {
  const [companies, setCompanies] = useState([]);
  const [videos, setVideos] = useState([]);
  const [scriptGenerations, setScriptGenerations] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadPageData() {
    setLoading(true);
    setError("");

    try {
      const [
        { companies: nextCompanies },
        { videos: nextVideos },
        { script_generations: nextScriptGenerations },
      ] = await Promise.all([getCompanies(), getVideos(), getScriptGenerations()]);

      setCompanies(nextCompanies);
      setVideos(nextVideos);
      setScriptGenerations(nextScriptGenerations);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "No se pudieron cargar las generaciones de guion.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPageData();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  const filteredVideos = useMemo(() => {
    if (!form.company_id) {
      return videos;
    }

    return videos.filter((video) => String(video.company_id) === String(form.company_id));
  }, [form.company_id, videos]);

  const filteredCampaigns = useMemo(() => {
    if (!form.company_id) {
      return [];
    }

    const company = companies.find((item) => String(item.id) === String(form.company_id));
    return (company?.campaigns || []).filter((campaign) => campaign.status !== "archived");
  }, [companies, form.company_id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const hasVariantContent =
        form.variant_title ||
        form.variant_angle ||
        form.variant_platform ||
        form.variant_duration_target ||
        form.variant_hook ||
        form.variant_body ||
        form.variant_cta;

      await createScriptGeneration({
        company_id: Number(form.company_id),
        campaign_id: form.campaign_id ? Number(form.campaign_id) : null,
        video_id: Number(form.video_id),
        original_script: form.original_script || null,
        generated_script: form.generated_script || null,
        hook: form.hook || null,
        cta: form.cta || null,
        status: form.status,
        version: Number(form.version),
        variants: hasVariantContent
          ? [
              {
                title: form.variant_title || null,
                angle: form.variant_angle || null,
                platform: form.variant_platform || null,
                duration_target: form.variant_duration_target
                  ? Number(form.variant_duration_target)
                  : null,
                hook: form.variant_hook || null,
                body: form.variant_body || null,
                cta: form.variant_cta || null,
                is_selected: true,
              },
            ]
          : [],
      });
      setForm(initialForm);
      await loadPageData();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "No se pudo crear la generacion de guion.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-8 pb-10">
      <section>
        <p className="text-xs uppercase tracking-[0.35em] text-sky-600">Guiones</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          Generaciones y variantes
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Crea borradores conectados a empresa y video para probar el flujo completo antes de
          automatizar transcripcion y generacion.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
        <Card className="border border-slate-200/80 bg-white/80 shadow-lg shadow-slate-200/50">
          <CardBody className="p-6">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Nueva generacion
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Usa selects dependientes para evitar mezclar videos y empresas.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <Select
                label="Empresa"
                selectedKeys={form.company_id ? [form.company_id] : []}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0];
                  setForm((current) => ({
                    ...current,
                    company_id: value || "",
                    campaign_id: "",
                    video_id: "",
                  }));
                }}
                isRequired
              >
                {companies.map((company) => (
                  <SelectItem key={String(company.id)}>{company.name}</SelectItem>
                ))}
              </Select>

              <Select
                label="Campana"
                selectedKeys={form.campaign_id ? [form.campaign_id] : []}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0];
                  setForm((current) => ({ ...current, campaign_id: value || "" }));
                }}
                isDisabled={!form.company_id || filteredCampaigns.length === 0}
                description={
                  form.company_id
                    ? "Opcional. Usa una campana si quieres orientar el mensaje y CTA."
                    : "Selecciona primero una empresa."
                }
              >
                {filteredCampaigns.map((campaign) => (
                  <SelectItem key={String(campaign.id)}>{campaign.name}</SelectItem>
                ))}
              </Select>

              <Select
                label="Video"
                selectedKeys={form.video_id ? [form.video_id] : []}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0];
                  setForm((current) => ({ ...current, video_id: value || "" }));
                }}
                isRequired
              >
                {filteredVideos.map((video) => (
                  <SelectItem key={String(video.id)}>
                    {video.filename || video.original_url || `Video #${video.id}`}
                  </SelectItem>
                ))}
              </Select>

              <Input label="Estado" name="status" value={form.status} onChange={handleChange} />
              <Input label="Version" name="version" type="number" value={form.version} onChange={handleChange} />
              <Textarea
                label="Script original"
                name="original_script"
                value={form.original_script}
                onChange={handleChange}
                minRows={3}
              />
              <Textarea
                label="Script generado"
                name="generated_script"
                value={form.generated_script}
                onChange={handleChange}
                minRows={4}
              />
              <Textarea label="Hook" name="hook" value={form.hook} onChange={handleChange} minRows={2} />
              <Textarea label="CTA" name="cta" value={form.cta} onChange={handleChange} minRows={2} />

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Variante inicial opcional
                </p>
                <div className="mt-4 space-y-4">
                  <Input
                    label="Titulo"
                    name="variant_title"
                    value={form.variant_title}
                    onChange={handleChange}
                  />
                  <Input
                    label="Angulo"
                    name="variant_angle"
                    value={form.variant_angle}
                    onChange={handleChange}
                  />
                  <Input
                    label="Plataforma"
                    name="variant_platform"
                    value={form.variant_platform}
                    onChange={handleChange}
                  />
                  <Input
                    label="Duracion objetivo"
                    name="variant_duration_target"
                    type="number"
                    value={form.variant_duration_target}
                    onChange={handleChange}
                  />
                  <Textarea
                    label="Hook variante"
                    name="variant_hook"
                    value={form.variant_hook}
                    onChange={handleChange}
                    minRows={2}
                  />
                  <Textarea
                    label="Body variante"
                    name="variant_body"
                    value={form.variant_body}
                    onChange={handleChange}
                    minRows={3}
                  />
                  <Textarea
                    label="CTA variante"
                    name="variant_cta"
                    value={form.variant_cta}
                    onChange={handleChange}
                    minRows={2}
                  />
                </div>
              </div>

              {error ? <p className="text-sm text-danger">{error}</p> : null}

              <Button color="primary" type="submit" fullWidth isLoading={submitting}>
                Crear generacion
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Listado</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Generaciones registradas
              </h2>
            </div>
            <Button variant="light" onPress={loadPageData} isLoading={loading}>
              Recargar
            </Button>
          </div>

          {loading ? <p className="text-sm text-slate-500">Cargando guiones...</p> : null}

          {!loading && scriptGenerations.length === 0 ? (
            <Card className="border border-dashed border-slate-300 bg-white/70">
              <CardBody className="p-6 text-sm leading-7 text-slate-500">
                Aun no hay generaciones. Crea primero empresa y video para poder registrar la
                primera.
              </CardBody>
            </Card>
          ) : null}

          {scriptGenerations.map((scriptGeneration) => (
            <Card
              key={scriptGeneration.id}
              className="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-200/40"
            >
              <CardBody className="gap-4 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {scriptGeneration.company?.name || "Empresa"} · v{scriptGeneration.version}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {scriptGeneration.video?.platform || "Sin plataforma"} ·{" "}
                      {scriptGeneration.status}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {scriptGeneration.campaign?.name
                        ? `Campana: ${scriptGeneration.campaign.name}`
                        : "Guion sin campana"}
                    </p>
                  </div>
                  <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-700">
                    {scriptGeneration.variants?.length || 0} variantes
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Hook</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {scriptGeneration.hook || "Sin hook"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">CTA</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {scriptGeneration.cta || "Sin CTA"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    Script generado
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {scriptGeneration.generated_script || "Sin contenido generado"}
                  </p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
