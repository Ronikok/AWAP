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

export async function fetchShowtimeById(id) {
  return readJson(await fetch(`${API_ROOT}/showtimes/${id}`));
}

async function post(path, body) {
  return readJson(
    await fetch(`${API_ROOT}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function registerUser(name, email, password) {
  return post("/auth/register", { name, email, password });
}

export function loginUser(email, password) {
  return post("/auth/login", { email, password });
}

export function logoutUser() {
  return post("/auth/logout", {});
}

export async function fetchMe() {
  return readJson(await fetch(`${API_ROOT}/auth/me`));
}
