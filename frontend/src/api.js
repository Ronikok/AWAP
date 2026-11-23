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

export async function fetchShowtimeSeats(id) {
  return readJson(await fetch(`${API_ROOT}/showtimes/${id}/seats`));
}

export function getTicketUrl(reservationId, sessionId) {
  const params = new URLSearchParams({ session_id: sessionId });
  return `${API_ROOT}/reservations/${reservationId}/ticket?${params}`;
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

export async function startCheckout({
  showtimeId,
  seatIds,
  customerName,
  email,
  ticketCount,
}) {
  return readJson(
    await fetch(`${API_ROOT}/checkout-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        showtimeId,
        seatIds,
        customerName,
        email,
        ticketCount,
      }),
    }),
  );
}

// ---- Owner: front page movies + showtimes (owner login required) ----

async function send(method, path, body) {
  return readJson(
    await fetch(`${API_ROOT}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}

export function fetchFeaturedMovies() {
  return send("GET", "/movies/featured");
}

export function fetchOwnerMovies() {
  return send("GET", "/admin/movies");
}

export function saveFeaturedMovies(movieIds) {
  return send("PUT", "/admin/featured", { movieIds });
}

export function fetchOwnerRooms() {
  return send("GET", "/admin/rooms");
}

export function fetchOwnerShowtimes() {
  return send("GET", "/admin/showtimes");
}

export function createShowtime(showtime) {
  return send("POST", "/admin/showtimes", showtime);
}

export function updateShowtime(id, showtime) {
  return send("PUT", `/admin/showtimes/${id}`, showtime);
}

export function deleteShowtime(id) {
  return send("DELETE", `/admin/showtimes/${id}`);
}
