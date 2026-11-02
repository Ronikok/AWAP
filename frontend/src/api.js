const API_ROOT = import.meta.env.API_ROOT || "/api";

export async function fetchHealth() {
  const response = await fetch(`${API_ROOT}/health`);
  return response.json();
}
