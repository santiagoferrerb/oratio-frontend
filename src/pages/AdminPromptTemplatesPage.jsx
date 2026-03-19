import { useEffect, useState } from "react";
import { Button, Card, CardBody, Input, Textarea } from "@heroui/react";
import {
  createPromptTemplate,
  getPromptTemplates,
  updatePromptTemplate,
} from "../services/promptTemplateService";

const EMPTY_FORM = {
  name: "",
  type: "script_generation",
  platform: "",
  prompt_text: "",
  is_active: true,
};

export default function AdminPromptTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState(null);

  async function loadTemplates() {
    setLoading(true);
    setError("");

    try {
      const { prompt_templates: promptTemplates } = await getPromptTemplates();
      setTemplates(promptTemplates);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "No se pudieron cargar los prompt templates.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  function handleChange(id, field, value) {
    setTemplates((current) =>
      current.map((template) =>
        template.id === id ? { ...template, [field]: value } : template,
      ),
    );
  }

  function handleNewTemplateChange(field, value) {
    setNewTemplate((current) => ({ ...current, [field]: value }));
  }

  async function handleCreate() {
    setCreating(true);
    setError("");

    try {
      await createPromptTemplate({
        ...newTemplate,
        platform: newTemplate.platform || null,
      });
      setNewTemplate(EMPTY_FORM);
      await loadTemplates();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "No se pudo crear el prompt template.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(template) {
    setSavingId(template.id);
    setError("");

    try {
      await updatePromptTemplate(template.id, {
        name: template.name,
        type: template.type,
        platform: template.platform || null,
        prompt_text: template.prompt_text,
        is_active: template.is_active,
      });
      await loadTemplates();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "No se pudo guardar el prompt template.",
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-8 pb-10">
      <section>
        <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          Prompt templates
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          Edita los prompts base usados por analisis y generacion. Esta vista solo debe estar
          disponible para administradores.
        </p>
      </section>

      <div className="flex justify-end">
        <Button variant="light" onPress={loadTemplates} isLoading={loading}>
          Recargar
        </Button>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Cargando prompt templates...</p> : null}

      <Card className="border border-amber-200/80 bg-amber-50/70 shadow-sm shadow-amber-100/60">
        <CardBody className="gap-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-amber-700">Nuevo template</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              Crear estrategia o prompt nuevo
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              Para `script_generation` puedes crear varias estrategias activas. El backend las
              rota automaticamente entre los templates activos de la misma plataforma.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nombre"
              value={newTemplate.name}
              onChange={(event) => handleNewTemplateChange("name", event.target.value)}
            />
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Tipo
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none"
                value={newTemplate.type}
                onChange={(event) => handleNewTemplateChange("type", event.target.value)}
              >
                <option value="script_generation">script_generation</option>
                <option value="content_analysis">content_analysis</option>
              </select>
            </label>
            <Input
              label="Plataforma"
              value={newTemplate.platform}
              onChange={(event) => handleNewTemplateChange("platform", event.target.value)}
            />
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={newTemplate.is_active}
                onChange={(event) => handleNewTemplateChange("is_active", event.target.checked)}
              />
              Dejar activo al crear
            </label>
          </div>

          <Textarea
            label="Prompt"
            value={newTemplate.prompt_text}
            onChange={(event) => handleNewTemplateChange("prompt_text", event.target.value)}
            minRows={8}
          />

          <div className="flex justify-end">
            <Button color="warning" isLoading={creating} onPress={handleCreate}>
              Crear template
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-4">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-200/40"
          >
            <CardBody className="gap-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    {template.type}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {template.platform || "Template global"} · {template.is_active ? "Activo" : "Inactivo"}
                  </p>
                </div>
                <div className="rounded-full bg-amber-50 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-700">
                  #{template.id}
                </div>
              </div>

              <Input
                label="Nombre"
                value={template.name}
                onChange={(event) => handleChange(template.id, "name", event.target.value)}
              />
              <Input
                label="Plataforma"
                value={template.platform || ""}
                onChange={(event) => handleChange(template.id, "platform", event.target.value)}
              />
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={template.is_active}
                  onChange={(event) =>
                    handleChange(template.id, "is_active", event.target.checked)
                  }
                />
                Template activo
              </label>
              <Textarea
                label="Prompt"
                value={template.prompt_text}
                onChange={(event) =>
                  handleChange(template.id, "prompt_text", event.target.value)
                }
                minRows={10}
              />

              <div className="flex justify-end">
                <Button
                  color="warning"
                  isLoading={savingId === template.id}
                  onPress={() => handleSave(template)}
                >
                  Guardar cambios
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
