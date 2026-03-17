import api from "./api";

export async function getDashboardOverview() {
  const { data } = await api.get("/dashboard/overview");
  return data;
}
