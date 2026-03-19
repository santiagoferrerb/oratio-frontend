import api from "./api";

export async function getCompanies() {
  const { data } = await api.get("/companies");
  return data;
}

export async function getCompany(id) {
  const { data } = await api.get(`/companies/${id}`);
  return data;
}

export async function createCompany(payload) {
  const { data } = await api.post("/companies", payload);
  return data;
}

export async function updateCompany(id, payload) {
  const { data } = await api.patch(`/companies/${id}`, payload);
  return data;
}

export async function createCampaign(payload) {
  const { data } = await api.post("/campaigns", payload);
  return data;
}

export async function getCampaigns(params = {}) {
  const { data } = await api.get("/campaigns", { params });
  return data;
}
