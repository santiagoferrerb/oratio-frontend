import api from "./api";

export async function getPromptTemplates() {
  const { data } = await api.get("/admin/prompt-templates");
  return data;
}

export async function createPromptTemplate(payload) {
  const { data } = await api.post("/admin/prompt-templates", payload);
  return data;
}

export async function updatePromptTemplate(id, payload) {
  const { data } = await api.patch(`/admin/prompt-templates/${id}`, payload);
  return data;
}
