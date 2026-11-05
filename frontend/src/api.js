const API_ROOT = import.meta.env.API_ROOT || "/api";

async function requestJson(path) {
  const response = await fetch(`${API_ROOT}${path}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export async function fetchApiHealth() {
  return requestJson("/health");
}

export async function fetchDbHealth() {
  return requestJson("/dbtest");
}
