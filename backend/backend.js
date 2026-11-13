import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

const app = express();
const port = Number(process.env.PORT || 8000);

const pool = new Pool({
  host: process.env.DB_HOST || "db",
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "appdb",
});

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:8080",
      "http://127.0.0.1:8080",
    ],
  }),
);

app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));
app.get("/api/readyz", (_req, res) => res.json({ status: "ready" }));
app.get("/api/health", (_req, res) =>
  res.json({ message: "AWAP API version 1.0.1" }),
);

app.get("/api/dbtest", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: `Database connection successful: ${result.rows[0].now}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.get("/api/dbTables", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    res.json({
      tables: result.rows.map((row) => row.table_name),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch database tables" });
  }
});

//Retrieves movie information from the movies table
app.get("/api/movies", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        id,
        title,
        duration_minutes,
        trailer_url,
        image_url,
        description,
        age_rating
       FROM movies
       ORDER BY title ASC`,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch movies:", error);
    res.status(500).json({
      error: "Failed to fetch movies",
    });
  }
});

// Tests the TMDB API connection by fetching popular movies
app.get("/api/tmdb/test", async (_req, res) => {
  try {
    const token = process.env.TMDB_READ_ACCESS_TOKEN;

    if (!token) {
      return res.status(500).json({
        error: "TMDB token is not configured",
      });
    }

    const response = await fetch(
      "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return res.status(502).json({
        error: `TMDB request failed with status ${response.status}`,
      });
    }

    const data = await response.json();

    res.json(
      data.results.map((movie) => ({
        tmdb_id: movie.id,
        title: movie.title,
        description: movie.overview,
        poster: movie.poster_path,
      })),
    );
  } catch (error) {
    console.error("TMDB connection failed:", error);
    res.status(500).json({
      error: "Failed to connect to TMDB",
    });
  }
});

// Retrieves movie showtimes from the database
app.get("/api/showtimes", async (req, res) => {
  try {
    const { city } = req.query;

    const result = await pool.query(
      `SELECT
        s.id,
        s.movie_id,
        m.title,
        m.image_url,
        s.start_time,
        s.ticket_price,
        r.id AS room_id,
        t.name AS theatre_name,
        t.city
       FROM showtimes s
       JOIN movies m ON s.movie_id = m.id
       JOIN rooms r ON s.room_id = r.id
       JOIN theatres t ON r.theatre_id = t.id
       WHERE ($1::text IS NULL OR LOWER(t.city) = LOWER($1::text))
       ORDER BY s.start_time ASC`,
      [city || null],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch showtimes:", error);
    res.status(500).json({
      error: "Failed to fetch showtimes",
    });
  }
});

app.get("/api/showtimes/:id", async (req, res) => {
  try {
    const movieId = Number(req.params.id);

    if (!Number.isInteger(movieId)) {
      return res.status(400).json({ error: "Movie ID must be an integer" });
    }

    const result = await pool.query(
      `SELECT
        s.id AS showtime_id,
        s.movie_id,
        m.title,
        m.image_url,
        m.description,
        m.duration_minutes,
        m.age_rating,
        s.start_time,
        s.ticket_price,
        r.id AS room_id,
        t.name AS theatre_name,
        t.city
       FROM showtimes s
       JOIN movies m ON s.movie_id = m.id
       JOIN rooms r ON s.room_id = r.id
       JOIN theatres t ON r.theatre_id = t.id
       WHERE s.movie_id = $1
       ORDER BY s.start_time ASC
       LIMIT 1`,
      [movieId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No showtime found for movie" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to fetch showtime:", error);
    res.status(500).json({ error: "Failed to fetch showtime" });
  }
});

app.get("api/getRoomCapacity", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT capacity FROM rooms WHERE id = ${req}`,
    );
    res.status(200).json({ result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.use((error, _req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "internal server error" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Backend listening on port ${port}`);
});
