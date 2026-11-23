import { Router } from "express";

// Owner-only content management: which movies are on the front page and
// the showtimes. Mounted at /api/admin (next to admin.js).
//
// Showtimes are stored as TIMESTAMP (no time zone), i.e. "wall clock" time at
// the theatre. To avoid the server/browser time zone shifting them, the API
// sends and receives them as plain strings: "YYYY-MM-DDTHH:MM".

// Gap kept free between two screenings in the same room (cleaning, ads).
const BUFFER_MINUTES = 15;

// A reservation "counts" if it is paid, or still waiting for payment inside its
// 15 minute window (same rule the seat map and checkout use). Expired and
// cancelled ones don't.
const ACTIVE_RESERVATION = `(r.status = 'paid' OR (r.status = 'pending_payment' AND r.expires_at > NOW()))`;

const LOCAL_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const MAX_FEATURED = 20;

const SHOWTIME_SELECT = `
  SELECT
    s.id,
    s.movie_id,
    m.title,
    m.duration_minutes,
    s.room_id,
    t.name AS theatre_name,
    t.city,
    s.ticket_price::float8 AS ticket_price,
    to_char(s.start_time, 'YYYY-MM-DD"T"HH24:MI') AS start_local
  FROM showtimes s
  JOIN movies m ON s.movie_id = m.id
  JOIN rooms r ON s.room_id = r.id
  JOIN theatres t ON r.theatre_id = t.id`;

function isValidLocalTime(value) {
  if (typeof value !== "string" || !LOCAL_TIME_RE.test(value)) return false;
  const d = new Date(`${value}:00Z`);
  // Rejects things like 2026-02-31 that match the pattern
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

// Returns { error } or { values } with cleaned-up showtime fields.
function parseShowtime(body) {
  const movieId = Number(body?.movie_id);
  const roomId = Number(body?.room_id);
  const price = Number(body?.ticket_price);
  const start = body?.start_local;

  if (!Number.isInteger(movieId)) return { error: "Choose a movie" };
  if (!Number.isInteger(roomId)) return { error: "Choose a room" };
  if (!isValidLocalTime(start)) return { error: "Start time is not valid" };
  if (!Number.isFinite(price) || price < 0 || price > 999) {
    return { error: "Ticket price must be between 0 and 999" };
  }
  return {
    values: {
      movieId,
      roomId,
      start,
      price: Math.round(price * 100) / 100,
    },
  };
}

// Adds the front page columns to an existing database the first time the
// backend starts after this feature is deployed (init.sql only runs on a fresh
// database, so Rahti would otherwise need a manual ALTER TABLE). Safe to run on
// every start: it does nothing once the columns exist.
// Existing movies start out featured, so the homepage looks the same until the
// owner changes it.
export async function ensureFeaturedColumns(pool) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'featured'`,
    );
    if (rows.length > 0) return;

    await client.query("BEGIN");
    await client.query(
      `ALTER TABLE movies
         ADD COLUMN featured BOOLEAN NOT NULL DEFAULT FALSE,
         ADD COLUMN featured_position INTEGER`,
    );
    await client.query(
      `UPDATE movies m
       SET featured = TRUE, featured_position = o.pos
       FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY title) AS pos FROM movies) o
       WHERE m.id = o.id`,
    );
    await client.query("COMMIT");
    console.log("Added featured columns to movies");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Failed to add featured columns to movies:", error);
  } finally {
    client.release();
  }
}

export function createOwnerRouter(pool, requireAuth, requireRole) {
  const router = Router();

  router.use(requireAuth, requireRole("owner"));

  // ---------- Front page movies ----------

  // Every movie, with whether it's on the front page and where
  router.get("/movies", async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT id, title, image_url, duration_minutes, featured, featured_position
       FROM movies
       ORDER BY title ASC`,
    );
    res.json(rows);
  });

  // Replaces the front page line-up. Body: { movieIds: [3, 1, 7] }
  // The order of the array is the order shown in the carousel.
  router.put("/featured", async (req, res) => {
    const ids = req.body?.movieIds;
    if (
      !Array.isArray(ids) ||
      !ids.every((id) => Number.isInteger(id)) ||
      new Set(ids).size !== ids.length
    ) {
      return res
        .status(400)
        .json({ error: "movieIds must be a list of unique movie IDs" });
    }
    if (ids.length > MAX_FEATURED) {
      return res
        .status(400)
        .json({ error: `At most ${MAX_FEATURED} movies can be on the front page` });
    }

    const found = await pool.query(
      "SELECT COUNT(*)::int AS n FROM movies WHERE id = ANY($1::int[])",
      [ids],
    );
    if (found.rows[0].n !== ids.length) {
      return res.status(400).json({ error: "Some movies do not exist" });
    }

    // One statement, so the line-up is never half-updated
    await pool.query(
      `UPDATE movies
       SET featured = (id = ANY($1::int[])),
           featured_position = array_position($1::int[], id)`,
      [ids],
    );
    res.json({ ok: true, movieIds: ids });
  });

  // ---------- Showtimes ----------

  router.get("/rooms", async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT
         r.id,
         r.capacity,
         t.name AS theatre_name,
         t.city,
         ROW_NUMBER() OVER (PARTITION BY r.theatre_id ORDER BY r.id)::int AS room_number
       FROM rooms r
       JOIN theatres t ON r.theatre_id = t.id
       ORDER BY t.city, r.id`,
    );
    res.json(rows);
  });

  // Showtimes from today onwards (past ones are history, not editable here)
  router.get("/showtimes", async (_req, res) => {
    const { rows } = await pool.query(
      `${SHOWTIME_SELECT}
       WHERE s.start_time >= CURRENT_DATE
       ORDER BY s.start_time ASC, s.id ASC`,
    );
    res.json(rows);
  });

  // True if the room already has a screening that collides with this one
  async function roomIsBusy(roomId, start, durationMinutes, ignoreId) {
    const { rows } = await pool.query(
      `SELECT 1
       FROM showtimes s
       JOIN movies m ON s.movie_id = m.id
       WHERE s.room_id = $1
         AND ($4::int IS NULL OR s.id <> $4::int)
         AND s.start_time < $2::timestamp + make_interval(mins => $3::int)
         AND s.start_time + make_interval(mins => m.duration_minutes + $5::int)
             > $2::timestamp
       LIMIT 1`,
      [roomId, start, durationMinutes, ignoreId ?? null, BUFFER_MINUTES],
    );
    return rows.length > 0;
  }

  // Shared by create and update. Returns the saved showtime or sends an error.
  async function saveShowtime(req, res, existingId) {
    const { error, values } = parseShowtime(req.body);
    if (error) return res.status(400).json({ error });

    if (existingId) {
      const current = await pool.query(
        `SELECT s.movie_id,
                s.room_id,
                to_char(s.start_time, 'YYYY-MM-DD"T"HH24:MI') AS start_local,
                EXISTS (
                  SELECT 1 FROM reservations r
                  WHERE r.showtime_id = s.id AND ${ACTIVE_RESERVATION}
                ) AS has_active
         FROM showtimes s
         WHERE s.id = $1`,
        [existingId],
      );
      if (current.rows.length === 0) {
        return res.status(404).json({ error: "Showtime not found" });
      }
      const c = current.rows[0];
      if (
        c.has_active &&
        (c.movie_id !== values.movieId ||
          c.room_id !== values.roomId ||
          c.start_local !== values.start)
      ) {
        return res.status(409).json({
          error:
            "This screening already has reservations, so its movie, room and time can't be changed (the price can)",
        });
      }
    }

    const movie = await pool.query(
      "SELECT duration_minutes FROM movies WHERE id = $1",
      [values.movieId],
    );
    if (movie.rows.length === 0) {
      return res.status(400).json({ error: "Movie does not exist" });
    }
    const room = await pool.query("SELECT id FROM rooms WHERE id = $1", [
      values.roomId,
    ]);
    if (room.rows.length === 0) {
      return res.status(400).json({ error: "Room does not exist" });
    }

    if (
      await roomIsBusy(
        values.roomId,
        values.start,
        movie.rows[0].duration_minutes,
        existingId,
      )
    ) {
      return res.status(409).json({
        error: `The room already has a screening at that time (a ${BUFFER_MINUTES} min break is kept between screenings)`,
      });
    }

    let id = existingId;
    if (existingId) {
      const { rowCount } = await pool.query(
        `UPDATE showtimes
         SET movie_id = $1, room_id = $2, start_time = $3::timestamp, ticket_price = $4
         WHERE id = $5`,
        [values.movieId, values.roomId, values.start, values.price, existingId],
      );
      if (rowCount === 0) {
        return res.status(404).json({ error: "Showtime not found" });
      }
    } else {
      const { rows } = await pool.query(
        `INSERT INTO showtimes (movie_id, room_id, start_time, ticket_price)
         VALUES ($1, $2, $3::timestamp, $4)
         RETURNING id`,
        [values.movieId, values.roomId, values.start, values.price],
      );
      id = rows[0].id;
    }

    const saved = await pool.query(`${SHOWTIME_SELECT} WHERE s.id = $1`, [id]);
    res.status(existingId ? 200 : 201).json({ showtime: saved.rows[0] });
  }

  router.post("/showtimes", (req, res) => saveShowtime(req, res, null));

  router.put("/showtimes/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Showtime ID must be an integer" });
    }
    return saveShowtime(req, res, id);
  });

  router.delete("/showtimes/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Showtime ID must be an integer" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Same row lock the Stripe checkout takes, so nobody can reserve seats
      // for this screening while it is being deleted.
      const locked = await client.query(
        "SELECT id FROM showtimes WHERE id = $1 FOR UPDATE",
        [id],
      );
      if (locked.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Showtime not found" });
      }

      const active = await client.query(
        `SELECT COUNT(*)::int AS n
         FROM reservations r
         WHERE r.showtime_id = $1 AND ${ACTIVE_RESERVATION}`,
        [id],
      );
      if (active.rows[0].n > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: `This screening has ${active.rows[0].n} paid or pending reservation(s) and can't be deleted`,
        });
      }

      // Only expired / cancelled / abandoned reservations are left. They have
      // no tickets, but they do point at the showtime, so they go with it.
      await client.query(
        `DELETE FROM reservation_seats
         WHERE reservation_id IN (SELECT id FROM reservations WHERE showtime_id = $1)`,
        [id],
      );
      await client.query("DELETE FROM reservations WHERE showtime_id = $1", [id]);
      await client.query("DELETE FROM showtimes WHERE id = $1", [id]);

      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });

  return router;
}
