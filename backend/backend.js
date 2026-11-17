import express from "express";
import cors from "cors";
import pg from "pg";
import Stripe from "stripe";

const { Pool } = pg;

const app = express();
const port = Number(process.env.PORT || 8000);
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

const pool = new Pool({
  host: process.env.DB_HOST || "db",
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "appdb",
});

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

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
    const showtimeId = Number(req.params.id);

    if (!Number.isInteger(showtimeId)) {
      return res.status(400).json({ error: "Showtime ID must be an integer" });
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
       WHERE s.id = $1
       ORDER BY s.start_time ASC
       LIMIT 1`,
      [showtimeId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Showtime not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to fetch showtime:", error);
    res.status(500).json({ error: "Failed to fetch showtime" });
  }
});

//stripe

app.post("/api/checkout-sessions", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    const showtimeId = Number(req.body.showtimeId);
    const seatIds = req.body.seatIds;
    const customerName = req.body.customerName;
    const email = req.body.email;

    if (
      !Number.isInteger(showtimeId) ||
      !Array.isArray(seatIds) ||
      seatIds.length === 0 ||
      !seatIds.every((seatId) => Number.isInteger(seatId)) ||
      typeof customerName !== "string" ||
      customerName.trim().length === 0 ||
      customerName.trim().length > 100 ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).json({
        error: "Choose seats and provide a valid email address",
      });
    }

    const uniqueSeatIds = [...new Set(seatIds)];
    if (uniqueSeatIds.length !== seatIds.length) {
      return res
        .status(400)
        .json({ error: "A seat can be selected only once" });
    }

    const client = await pool.connect();
    let showtime;
    let reservationId;
    let totalCents;

    try {
      await client.query("BEGIN");
      const showtimeResult = await client.query(
        `SELECT s.id AS showtime_id, s.ticket_price, s.room_id, m.title
         FROM showtimes s
         JOIN movies m ON s.movie_id = m.id
         WHERE s.id = $1
         FOR UPDATE`,
        [showtimeId],
      );

      if (showtimeResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Showtime not found" });
      }

      showtime = showtimeResult.rows[0];
      const seatResult = await client.query(
        `SELECT id
         FROM seats
         WHERE room_id = $1
           AND id = ANY($2::int[])
           AND is_client_reserved = FALSE
         FOR UPDATE`,
        [showtime.room_id, uniqueSeatIds],
      );

      if (seatResult.rows.length !== uniqueSeatIds.length) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "One or more seats are invalid" });
      }

      const takenResult = await client.query(
        `SELECT rs.seat_id
         FROM reservation_seats rs
         JOIN reservations r ON r.id = rs.reservation_id
         WHERE r.showtime_id = $1
           AND r.status IN ('pending_payment', 'paid')
           AND (r.status = 'paid' OR r.expires_at > NOW())
           AND rs.seat_id = ANY($2::int[])
         FOR UPDATE`,
        [showtimeId, uniqueSeatIds],
      );

      if (takenResult.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "One or more seats are no longer available",
        });
      }

      const ticketPriceCents = Math.round(Number(showtime.ticket_price) * 100);
      const discountedSeats = Math.floor(uniqueSeatIds.length / 10);
      totalCents =
        uniqueSeatIds.length * ticketPriceCents -
        discountedSeats * Math.round(ticketPriceCents / 2);

      const reservationResult = await client.query(
        `INSERT INTO reservations (
          customer_name, customer_email, showtime_id, expires_at, total_price
        ) VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes', $4)
        RETURNING id`,
        [customerName.trim(), email, showtimeId, totalCents / 100],
      );
      reservationId = reservationResult.rows[0].id;

      await client.query(
        `INSERT INTO reservation_seats (reservation_id, seat_id)
         SELECT $1, UNNEST($2::int[])`,
        [reservationId, uniqueSeatIds],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: `${showtime.title} tickets` },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/payment-success?reservation_id=${reservationId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/seatingmap/${showtimeId}`,
      metadata: {
        showtimeId: String(showtimeId),
        reservationId: String(reservationId),
        seatIds: uniqueSeatIds.join(","),
      },
    });

    await pool.query(
      "UPDATE reservations SET stripe_checkout_session_id = $1 WHERE id = $2",
      [session.id, reservationId],
    );
    res.status(201).json({ url: session.url, reservationId });
  } catch (error) {
    console.error("Failed to create Stripe checkout session:", error);
    res.status(500).json({ error: "Failed to create payment session" });
  }
});

async function handleStripeWebhook(req, res) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !stripe) {
    return res.status(503).send("Stripe webhook is not configured");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error("Webhook signature check failed:", error.message);
    return res.status(400).send("Invalid webhook signature");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const eventResult = await client.query(
      `INSERT INTO processed_stripe_events (event_id)
       VALUES ($1)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [event.id],
    );

    if (eventResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.json({ received: true, duplicate: true });
    }

    const session = event.data.object;
    const reservationId = Number(session.metadata?.reservationId);

    if (
      Number.isInteger(reservationId) &&
      (event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded") &&
      (event.type !== "checkout.session.completed" ||
        session.payment_status === "paid")
    ) {
      await client.query(
        `UPDATE reservations
         SET status = 'paid', stripe_payment_intent_id = $1
         WHERE id = $2 AND status = 'pending_payment'`,
        [session.payment_intent || null, reservationId],
      );
      await client.query(
        `INSERT INTO tickets (reservation_id, seat_id)
         SELECT reservation_id, seat_id
         FROM reservation_seats
         WHERE reservation_id = $1
         ON CONFLICT (reservation_id, seat_id) DO NOTHING`,
        [reservationId],
      );
    }

    if (
      Number.isInteger(reservationId) &&
      event.type === "checkout.session.expired"
    ) {
      await client.query(
        "UPDATE reservations SET status = 'expired' WHERE id = $1 AND status = 'pending_payment'",
        [reservationId],
      );
    }

    await client.query("COMMIT");
    res.json({ received: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to process Stripe webhook:", error);
    res.status(500).json({ error: "Failed to process webhook" });
  } finally {
    client.release();
  }
}
//stripe portion ends

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
