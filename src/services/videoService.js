import api from "./api";

export async function getVideos(params = {}) {
  const { data } = await api.get("/videos", { params });
  return data;
}

export async function getVideo(id) {
  const { data } = await api.get(`/videos/${id}`);
  return data;
}

export async function createVideo(payload) {
  const { data } = await api.post("/videos", payload);
  return data;
}

export async function extractVideoAudio(id) {
  const { data } = await api.post(`/videos/${id}/extract-audio`);
  return data;
}

export async function transcribeVideoAudio(id) {
  const { data } = await api.post(`/videos/${id}/transcribe`);
  return data;
}

export async function analyzeVideoStructure(id) {
  const { data } = await api.post(`/videos/${id}/analyze-structure`);
  return data;
}

export async function generateVideoScript(id) {
  const { data } = await api.post(`/videos/${id}/generate-script`);
  return data;
}
