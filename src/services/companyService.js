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
