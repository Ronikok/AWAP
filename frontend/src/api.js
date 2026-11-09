const API_ROOT = import.meta.env.API_ROOT || "/api";

async function readJson(response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export async function fetchApiHealth() {
  return readJson(await fetch(`${API_ROOT}/health`));
}

export async function fetchDbHealth() {
  return readJson(await fetch(`${API_ROOT}/dbtest`));
}

export async function fetchRoomCapacity(id) {
  return readJson(`${API_ROOT}/getRoomCapacity/${id}`);
}
