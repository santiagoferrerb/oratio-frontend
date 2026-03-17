import { useEffect, useState } from "react";
import { Button, Card, CardBody, Input, Textarea } from "@heroui/react";
import { createCompany, getCompanies } from "../services/companyService";

const initialForm = {
  name: "",
  industry: "",
  tone: "",
  target_audience: "",
  brand_values: "",
  communication_style: "",
  cta_style: "",
  preferred_words: "",
  forbidden_words: "",
  objective: "",
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadCompanies() {
    setLoading(true);
    setError("");

    try {
      const { companies: nextCompanies } = await getCompanies();
      setCompanies(nextCompanies);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No se pudieron cargar las empresas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await createCompany({
        name: form.name,
        industry: form.industry || null,
        brief: {
          tone: form.tone || null,
          target_audience: form.target_audience || null,
          brand_values: form.brand_values || null,
          communication_style: form.communication_style || null,
          cta_style: form.cta_style || null,
          preferred_words: form.preferred_words || null,
          forbidden_words: form.forbidden_words || null,
          objective: form.objective || null,
        },
      });
      setForm(initialForm);
      await loadCompanies();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No se pudo crear la empresa.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-8 pb-10">
      <section>
        <p className="text-xs uppercase tracking-[0.35em] text-sky-600">Empresas</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          Contexto de marca operativo
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Crea y consulta las empresas activas con el brief que luego usaras para adaptar
          guiones y validar tono, audiencia y CTA.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="border border-slate-200/80 bg-white/80 shadow-lg shadow-slate-200/50">
          <CardBody className="p-6">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Nueva empresa
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Define identidad base y un primer brief activo.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <Input label="Nombre" name="name" value={form.name} onChange={handleChange} isRequired />
              <Input
                label="Industria"
                name="industry"
                value={form.industry}
                onChange={handleChange}
              />
              <Input label="Tono" name="tone" value={form.tone} onChange={handleChange} />
              <Input
                label="Audiencia"
                name="target_audience"
                value={form.target_audience}
                onChange={handleChange}
              />
              <Input
                label="CTA style"
                name="cta_style"
                value={form.cta_style}
                onChange={handleChange}
              />
              <Textarea
                label="Valores de marca"
                name="brand_values"
                value={form.brand_values}
                onChange={handleChange}
                minRows={2}
              />
              <Textarea
                label="Estilo de comunicacion"
                name="communication_style"
                value={form.communication_style}
                onChange={handleChange}
                minRows={2}
              />
              <Textarea
                label="Palabras preferidas"
                name="preferred_words"
                value={form.preferred_words}
                onChange={handleChange}
                minRows={2}
              />
              <Textarea
                label="Palabras prohibidas"
                name="forbidden_words"
                value={form.forbidden_words}
                onChange={handleChange}
                minRows={2}
              />
              <Textarea
                label="Objetivo"
                name="objective"
                value={form.objective}
                onChange={handleChange}
                minRows={3}
              />

              {error ? <p className="text-sm text-danger">{error}</p> : null}

              <Button color="primary" type="submit" fullWidth isLoading={submitting}>
                Crear empresa
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Listado</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Empresas registradas
              </h2>
            </div>
            <Button variant="light" onPress={loadCompanies} isLoading={loading}>
              Recargar
            </Button>
          </div>

          {loading ? <p className="text-sm text-slate-500">Cargando empresas...</p> : null}

          {!loading && companies.length === 0 ? (
            <Card className="border border-dashed border-slate-300 bg-white/70">
              <CardBody className="p-6 text-sm leading-7 text-slate-500">
                Aun no hay empresas. Crea la primera para habilitar videos y guiones.
              </CardBody>
            </Card>
          ) : null}

          {companies.map((company) => {
            const activeBrief = company.briefs?.find((brief) => brief.is_active) || company.briefs?.[0];

            return (
              <Card
                key={company.id}
                className="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-200/40"
              >
                <CardBody className="gap-4 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                        {company.name}
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">
                        {company.industry || "Industria no definida"}
                      </p>
                    </div>
                    <div className="rounded-full bg-sky-50 px-3 py-1 text-xs uppercase tracking-[0.2em] text-sky-700">
                      #{company.id}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Tono</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {activeBrief?.tone || "Sin brief activo"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Audiencia</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {activeBrief?.target_audience || "Sin audiencia definida"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">CTA</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {activeBrief?.cta_style || "Sin estilo de CTA"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Objetivo</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {activeBrief?.objective || "Sin objetivo declarado"}
                      </p>
                    </div>
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
