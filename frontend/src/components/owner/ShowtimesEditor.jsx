import { useEffect, useRef, useState } from "react";
import {
  createShowtime,
  deleteShowtime,
  fetchOwnerMovies,
  fetchOwnerRooms,
  fetchOwnerShowtimes,
  updateShowtime,
} from "../../api";

const EMPTY_FORM = { movie_id: "", room_id: "", start_local: "", ticket_price: "" };

function todayStart() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00`;
}

function formatPrice(price) {
  return `${price.toFixed(2).replace(".", ",")} €`;
}

function formatDay(day) {
  // "YYYY-MM-DD" -> "torstai 20.11." (parsed as local time, so no shifting)
  return new Date(`${day}T00:00`).toLocaleDateString("fi-FI", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
  });
}

// Add, edit and delete showtimes. Changes are saved straight to the database
// and show up on the Oulu / Tampere pages immediately.
export default function ShowtimesEditor() {
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [cityFilter, setCityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const formRef = useRef(null);

  useEffect(() => {
    Promise.all([fetchOwnerShowtimes(), fetchOwnerMovies(), fetchOwnerRooms()])
      .then(([st, mv, rm]) => {
        setShowtimes(st);
        setMovies(mv);
        setRooms(rm);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const cities = [...new Set(rooms.map((r) => r.city))];
  const visible = showtimes.filter((s) => !cityFilter || s.city === cityFilter);

  // Group by day for readability (the list is already sorted by time)
  const days = [];
  for (const showtime of visible) {
    const day = showtime.start_local.slice(0, 10);
    const last = days[days.length - 1];
    if (last && last.day === day) last.items.push(showtime);
    else days.push({ day, items: [showtime] });
  }

  function roomLabel(room) {
    return `${room.city}, sali ${room.room_number} (${room.capacity} paikkaa)`;
  }

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function startEdit(showtime) {
    setEditingId(showtime.id);
    setForm({
      movie_id: String(showtime.movie_id),
      room_id: String(showtime.room_id),
      start_local: showtime.start_local,
      ticket_price: String(showtime.ticket_price),
    });
    setError("");
    setMessage("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    const payload = {
      movie_id: Number(form.movie_id),
      room_id: Number(form.room_id),
      start_local: form.start_local,
      ticket_price: Number(form.ticket_price.replace(",", ".")),
    };

    try {
      if (editingId) await updateShowtime(editingId, payload);
      else await createShowtime(payload);

      setShowtimes(await fetchOwnerShowtimes());
      setMessage(editingId ? "Näytös päivitetty." : "Näytös lisätty.");
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(showtime) {
    const when = `${formatDay(showtime.start_local.slice(0, 10))} klo ${showtime.start_local.slice(11)}`;
    if (!window.confirm(`Poistetaanko näytös: ${showtime.title}, ${when}?`)) return;

    setError("");
    setMessage("");
    try {
      await deleteShowtime(showtime.id);
      setShowtimes((prev) => prev.filter((s) => s.id !== showtime.id));
      if (editingId === showtime.id) cancelEdit();
      setMessage("Näytös poistettu.");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>Ladataan näytöksiä...</p>;

  return (
    <section>
      <form className="owner-form" onSubmit={handleSubmit} ref={formRef}>
        <h2>{editingId ? "Muokkaa näytöstä" : "Lisää näytös"}</h2>

        <label htmlFor="st-movie">Elokuva</label>
        <select
          id="st-movie"
          value={form.movie_id}
          onChange={(e) => setField("movie_id", e.target.value)}
          required
        >
          <option value="">Valitse elokuva</option>
          {movies.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title} ({m.duration_minutes} min)
            </option>
          ))}
        </select>

        <label htmlFor="st-room">Sali</label>
        <select
          id="st-room"
          value={form.room_id}
          onChange={(e) => setField("room_id", e.target.value)}
          required
        >
          <option value="">Valitse sali</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {roomLabel(r)}
            </option>
          ))}
        </select>

        <div className="owner-form-split">
          <div>
            <label htmlFor="st-start">Alkamisaika</label>
            <input
              id="st-start"
              type="datetime-local"
              step="300"
              min={todayStart()}
              value={form.start_local}
              onChange={(e) => setField("start_local", e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="st-price">Hinta (€)</label>
            <input
              id="st-price"
              type="number"
              min="0"
              max="999"
              step="0.10"
              value={form.ticket_price}
              onChange={(e) => setField("ticket_price", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="owner-savebar">
          <button type="submit" className="owner-primary" disabled={submitting}>
            {submitting
              ? "Tallennetaan..."
              : editingId
                ? "Tallenna muutokset"
                : "Lisää näytös"}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit}>
              Peruuta
            </button>
          )}
          {message && <span className="owner-success">{message}</span>}
          {error && <span className="owner-error">{error}</span>}
        </div>
      </form>

      <div className="owner-list-header">
        <h2>Tulevat näytökset</h2>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          aria-label="Suodata paikkakunnan mukaan"
        >
          <option value="">Kaikki paikkakunnat</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {days.length === 0 && (
        <p className="owner-empty">Ei tulevia näytöksiä.</p>
      )}

      {days.map(({ day, items }) => (
        <div key={day} className="owner-day">
          <h3>{formatDay(day)}</h3>
          <ul className="owner-list">
            {items.map((s) => (
              <li
                key={s.id}
                className={
                  s.id === editingId ? "owner-row owner-row-editing" : "owner-row"
                }
              >
                <span className="owner-time">{s.start_local.slice(11)}</span>
                <span className="owner-row-title">
                  {s.title}
                  <small>
                    {s.city}, sali{" "}
                    {rooms.find((r) => r.id === s.room_id)?.room_number ?? s.room_id}
                    {" · "}
                    {formatPrice(s.ticket_price)}
                  </small>
                </span>
                <div className="owner-row-actions">
                  <button type="button" onClick={() => startEdit(s)}>
                    Muokkaa
                  </button>
                  <button
                    type="button"
                    className="owner-danger"
                    onClick={() => handleDelete(s)}
                  >
                    Poista
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
