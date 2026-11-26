import { Router } from "express";

// Logged-in customer's own data. Mounted at /api/profile.

// Reservations needed for one free showing.
const LOYALTY_TARGET = 10;

const ACTIVE_RESERVATION = `(r.status = 'paid' OR (r.status = 'pending_payment' AND r.expires_at > NOW()))`;

const OWNED_BY_USER = `(r.user_id = $1 OR (r.user_id IS NULL AND LOWER(r.customer_email) = LOWER($2)))`;

export function createProfileRouter(pool, requireAuth) {
  const router = Router();

  router.use(requireAuth);

  router.get("/reservations", async (req, res) => {
    const params = [req.user.id, req.user.email];

    try {
      const [upcomingResult, totalResult] = await Promise.all([
        pool.query(
          `SELECT
             r.id,
             r.status,
             r.expires_at,
             r.total_price::float8 AS total_price,
             s.id AS showtime_id,
             to_char(s.start_time, 'YYYY-MM-DD"T"HH24:MI') AS start_local,
             m.title,
             m.image_url,
             t.name AS theatre_name,
             t.city,
             s.room_id,
             COALESCE(
               json_agg(
                 json_build_object(
                   'row_number', st.row_number,
                   'seat_number', st.seat_number,
                   'is_wheelchair', st.is_wheelchair,
                   'ticket_type', rs.ticket_type
                 )
                 ORDER BY st.row_number, st.seat_number
               ) FILTER (WHERE st.id IS NOT NULL),
               '[]'
             ) AS seats
           FROM reservations r
           JOIN showtimes s ON s.id = r.showtime_id
           JOIN movies m ON m.id = s.movie_id
           JOIN rooms rm ON rm.id = s.room_id
           JOIN theatres t ON t.id = rm.theatre_id
           LEFT JOIN reservation_seats rs ON rs.reservation_id = r.id
           LEFT JOIN seats st ON st.id = rs.seat_id
           WHERE ${OWNED_BY_USER}
             AND ${ACTIVE_RESERVATION}
             -- start_time is theatre wall-clock time (no time zone)
             AND s.start_time > (NOW() AT TIME ZONE 'Europe/Helsinki')
           GROUP BY r.id, s.id, m.id, t.id
           ORDER BY s.start_time ASC`,
          params,
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total
           FROM reservations r
           WHERE ${OWNED_BY_USER}
             AND ${ACTIVE_RESERVATION}`,
          params,
        ),
      ]);

      const total = totalResult.rows[0].total;
      const progress = total % LOYALTY_TARGET;
      const freeShowingReady = total > 0 && progress === 0;

      res.json({
        reservations: upcomingResult.rows,
        loyalty: {
          target: LOYALTY_TARGET,
          total,
          filled: freeShowingReady ? LOYALTY_TARGET : progress,
          remaining: freeShowingReady ? 0 : LOYALTY_TARGET - progress,
          freeShowingReady,
          freeShowingsEarned: Math.floor(total / LOYALTY_TARGET),
        },
      });
    } catch (error) {
      console.error("Failed to fetch profile reservations:", error);
      res.status(500).json({ error: "Failed to fetch reservations" });
    }
  });

  return router;
}
