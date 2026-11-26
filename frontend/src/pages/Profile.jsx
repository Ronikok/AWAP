import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchMyReservations } from "../api.js";
import "./profile.css";

const TEXT = {
  title: "Oma profiili",
  loyaltyTitle: "Kanta-asiakasetu",
  loyaltyReady: "Ansaitsit 50% alennuksen!",
  loyaltyEarned: (n) => `Ansaitut alennukset: ${n}`,
  loyaltyRemaining: (n) =>
    n === 1
      ? "Vielä 1 50% alennukseen."
      : `Vielä ${n} varausta 50% alennukseen.`,
  reservationsTitle: "Tulevat varaukset",
  empty: "Sinulla ei ole tulevia varauksia.",
  browse: "Selaa näytöksiä",
  loading: "Ladataan...",
  paid: "Maksettu",
  pending: "Odottaa maksua",
  until: "Varaus raukeaa",
  seats: "Paikat",
  total: "Yhteensä",
  wheelchair: "Pyörätuolipaikka",
  row: "Rivi",
  seat: "paikka",
};

// Showtimes come from the API as theatre wall-clock strings ("YYYY-MM-DDTHH:MM").
// Formatting the string directly keeps the browser's time zone out of it.
function formatLocal(value) {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-");
  return `${Number(day)}.${Number(month)}.${year} klo ${time.replace(":", ".")}`;
}

function formatSeat(seat) {
  return seat.is_wheelchair
    ? `${TEXT.wheelchair} ${seat.seat_number}`
    : `${TEXT.row} ${seat.row_number}, ${TEXT.seat} ${seat.seat_number}`;
}

function formatExpiry(value) {
  return new Date(value).toLocaleString("fi-FI", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LoyaltyCard({ loyalty }) {
  const { target, filled, remaining, freeShowingReady, freeShowingsEarned } =
    loyalty;

  return (
    <section
      className={`profile-panel profile-loyalty ${
        freeShowingReady ? "is-complete" : ""
      }`}
    >
      <div className="profile-loyalty-head">
        <h2>{TEXT.loyaltyTitle}</h2>
        <span className="profile-loyalty-count">
          {filled} / {target}
        </span>
      </div>

      <div
        className="profile-stamps"
        role="img"
        aria-label={`${filled} / ${target}`}
      >
        {Array.from({ length: target }, (_, i) => (
          <span
            key={i}
            className={i < filled ? "profile-stamp filled" : "profile-stamp"}
          >
            {i + 1}
          </span>
        ))}
      </div>

      <p className="profile-loyalty-text">
        {freeShowingReady
          ? TEXT.loyaltyReady
          : TEXT.loyaltyRemaining(remaining)}
      </p>
      {freeShowingsEarned > 0 && (
        <p className="profile-hint">
          {TEXT.loyaltyEarned(freeShowingsEarned)}
        </p>
      )}
    </section>
  );
}

function ReservationCard({ reservation }) {
  const isPaid = reservation.status === "paid";

  return (
    <li className="profile-reservation">
      {reservation.image_url ? (
        <img
          className="profile-poster"
          src={reservation.image_url}
          alt={reservation.title}
        />
      ) : (
        <div className="profile-poster profile-poster-empty" aria-hidden="true" />
      )}

      <div className="profile-reservation-body">
        <div className="profile-reservation-top">
          <h3>{reservation.title}</h3>
          <span
            className={`profile-badge ${isPaid ? "badge-paid" : "badge-pending"}`}
          >
            {isPaid ? TEXT.paid : TEXT.pending}
          </span>
        </div>

        <p className="profile-showtime">{formatLocal(reservation.start_local)}</p>
        <p className="profile-hint">
          {reservation.theatre_name ? `${reservation.theatre_name}, ` : ""}
          {reservation.city}
        </p>

        <p className="profile-seats-label">{TEXT.seats}</p>
        <ul className="profile-seat-list">
          {reservation.seats.map((seat, i) => (
            <li key={i}>{formatSeat(seat)}</li>
          ))}
        </ul>

        <div className="profile-reservation-foot">
          <span>
            {TEXT.total}:{" "}
            <strong>{Number(reservation.total_price ?? 0).toFixed(2)} €</strong>
          </span>
          {!isPaid && reservation.expires_at && (
            <span className="profile-hint">
              {TEXT.until} {formatExpiry(reservation.expires_at)}
            </span>
          )}
          <span className="profile-hint">#{reservation.id}</span>
        </div>
      </div>
    </li>
  );
}

// Route is wrapped in <ProtectedRoute /> in App.jsx, so a user is always logged in here.
export default function Profile() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchMyReservations()
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="profile-page">
      <h1>{TEXT.title}</h1>
      <p className="profile-user">
        {user.name} · <span>{user.email}</span>
      </p>

      {error && <p className="profile-error">{error}</p>}
      {!data && !error && <p className="profile-hint">{TEXT.loading}</p>}

      {data && (
        <div className="profile-layout">
          <LoyaltyCard loyalty={data.loyalty} />

          <section>
            <h2>{TEXT.reservationsTitle}</h2>
            {data.reservations.length === 0 ? (
              <div className="profile-panel profile-empty">
                <p>{TEXT.empty}</p>
                <Link to="/" className="profile-button">
                  {TEXT.browse}
                </Link>
              </div>
            ) : (
              <ul className="profile-reservation-list">
                {data.reservations.map((reservation) => (
                  <ReservationCard
                    key={reservation.id}
                    reservation={reservation}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
