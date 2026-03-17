import api from "./api";

export async function getScriptGenerations(params = {}) {
  const { data } = await api.get("/script-generations", { params });
  return data;
}

export async function getScriptGeneration(id) {
  const { data } = await api.get(`/script-generations/${id}`);
  return data;
}

export async function createScriptGeneration(payload) {
  const { data } = await api.post("/script-generations", payload);
  return data;
}
