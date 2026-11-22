import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { startCheckout, fetchShowtimeById, fetchShowtimeSeats } from "../api";
import ConfirmSeatsModal from "../components/ConfirmSeatsModal";
import { useAuth } from "../context/AuthContext";
import "../assets/seatingMap.css";

export default function SeatingMap() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [showtimeMovie, setShowtimeMovie] = useState(null);
  const [seats, setSeats] = useState([]);
  const [showtimeError, setShowtimeError] = useState("");
  const [paymentError, setPaymentError] = useState(() =>
    searchParams.get("payment") === "cancelled"
      ? searchParams.get("error") || "Payment was cancelled. Please try again."
      : "",
  );
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { user, loading } = useAuth();
  const [prefilledInfo, setPrefilledInfo] = useState(false);

  useEffect(() => {
    if (searchParams.get("payment") === "cancelled") {
      searchParams.delete("payment");
      searchParams.delete("error");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let active = true;

    Promise.all([fetchShowtimeById(id), fetchShowtimeSeats(id)])
      .then(([showtime, showtimeSeats]) => {
        if (active) {
          setShowtimeMovie({ ...showtime, poster: showtime.image_url });
          setSeats(showtimeSeats);
        }
      })
      .catch((error) => {
        console.error("Failed to load showtime:", error);
        if (active) setShowtimeError(error.message);
      });

    return () => {
      active = false;
    };
  }, [id]);

  function formatShowtime(startTime) {
    if (!startTime) return "Showtime not selected";

    const [date, time] = startTime.replace("T", " ").split(" ");
    const [year, month, day] = date.split("-");

    return `${day}.${month}.${year} ${time?.slice(0, 5) || ""}`;
  }

  function formatEndTime() {
    if (!showtimeMovie?.start_time) return "End time unavailable";

    const durationMinutes = Number(showtimeMovie.duration_minutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes < 0) {
      return "End time unavailable";
    }

    const start = new Date(
      showtimeMovie.start_time.replace(" ", "T").replace(/Z$/, ""),
    );
    if (Number.isNaN(start.getTime())) return "End time unavailable";

    const end = new Date(start.getTime() + durationMinutes * 60_000);
    const day = String(end.getDate()).padStart(2, "0");
    const month = String(end.getMonth() + 1).padStart(2, "0");
    const year = end.getFullYear();
    const hours = String(end.getHours()).padStart(2, "0");
    const minutes = String(end.getMinutes()).padStart(2, "0");

    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }

  function toggleSeat(seatId) {
    setSelectedSeats((current) =>
      current.includes(seatId)
        ? current.filter((id) => id !== seatId)
        : [...current, seatId],
    );
  }

  function calculatePrice(seatsToCalculate) {
    const ticketPriceCents = Math.round(
      Number(showtimeMovie?.ticket_price || 0) * 100,
    );
    const discountedSeats = Math.floor(seatsToCalculate.length / 10);
    return (
      seatsToCalculate.length * ticketPriceCents -
      discountedSeats * Math.round(ticketPriceCents / 2)
    );
  }

  function formatPrice(priceInCents) {
    return (priceInCents / 100).toFixed(2);
  }

  async function handlePayment() {
    setPaymentError("");
    setIsStartingPayment(true);

    try {
      const { url } = await startCheckout({
        showtimeId: id,
        seatIds: selectedSeats,
        customerName,
        email,
        ticketCount: selectedSeats.length,
      });
      window.location.assign(url);
    } catch (error) {
      setPaymentError(error.message);
      setIsStartingPayment(false);
    }
  }

  function createSeatingMap() {
    const rowNumbers = [...new Set(seats.map((seat) => seat.row_number))].sort(
      (a, b) => a - b,
    );

    return rowNumbers.map((rowNumber, rowIndex) => (
      <div key={rowNumber} className="seatingRow">
        <span className="rowLabel">R{rowNumber}</span>

        {seats
          .filter((seat) => seat.row_number === rowNumber)
          .sort((a, b) =>
            rowIndex % 2 === 0
              ? a.column_position - b.column_position
              : b.column_position - a.column_position,
          )
          .map((seat) => {
            const isVip = seat.seat_number === 13;
            const isSelected = selectedSeats.includes(seat.id);
            const isUnavailable = seat.is_client_reserved || seat.is_reserved;

            return (
              <button
                key={seat.id}
                type="button"
                className={`seatButton ${isSelected ? "is-selected" : ""}`}
                aria-label={`Row ${seat.row_number}, seat ${seat.seat_number}`}
                aria-pressed={isSelected}
                disabled={isUnavailable || isVip}
                onClick={() => toggleSeat(seat.id)}
              >
                {isVip ? "VIP" : seat.seat_number}
              </button>
            );
          })}
      </div>
    ));
  }

  function openConfirmationModal() {
    if (!loading && user) {
      setCustomerName(user.name);
      setEmail(user.email);
      setPrefilledInfo(true);
    } else if (prefilledInfo) {
      setCustomerName("");
      setEmail("");
      setPrefilledInfo(false);
    }
    setShowConfirmation(true);
  }

  return (
    <main className="seatingPage">
      {!showtimeMovie && !showtimeError && (
        <p className="seatingStatus">Loading showtime...</p>
      )}
      {showtimeError && (
        <p className="seatingStatus text-danger">{showtimeError}</p>
      )}
      {showtimeMovie && (
        <section className="seatingLayout">
          <div className="seatingPanel p-3 p-md-4 overflow-hidden">
            <div className="screen" aria-label="Cinema screen">
              <span>SCREEN</span>
            </div>
            <div className="seatingScroller">
              <div className="aisle aisleLeft" aria-label="Entrance exit aisle">
                <span className="aisleSign">Entrance / Exit Aisle</span>
              </div>
              <div id="seatingwrapper" className="seatingGrid">
                {seats.length > 0 ? (
                  createSeatingMap()
                ) : (
                  <p className="noSeatsSelected">No seats available</p>
                )}
              </div>
              <div
                className="aisle aisleRight"
                aria-label="Entrance exit aisle"
              >
                <span className="aisleSign">Entrance / Exit Aisle</span>
              </div>
            </div>
            <div
              className="d-flex flex-wrap justify-content-center gap-3 mt-3 small text-secondary"
              aria-label="Seat legend"
            >
              <span className="d-flex align-items-center gap-2">
                <i className="legendSeat"></i>Available
              </span>
              <span className="d-flex align-items-center gap-2">
                <i className="legendSeat legendSelected"></i>Selected
              </span>
              <span className="d-flex align-items-center gap-2">
                <i className="legendSeat legendUnavailable"></i>Unavailable
              </span>
            </div>
          </div>

          <aside className="bookingPanel p-3">
            {showtimeMovie.poster ? (
              <div className="posterWrapper">
                <img src={showtimeMovie.poster} alt={showtimeMovie.title} />
              </div>
            ) : (
              <div className="posterPlaceholder">{showtimeMovie.title}</div>
            )}
            <h1 className="h4 text-center mb-2">{showtimeMovie.title}</h1>
            {showtimeMovie.description && (
              <p className="text-secondary small text-center mb-3">
                {showtimeMovie.description}
              </p>
            )}
            <dl className="mb-0 border-top border-secondary">
              {showtimeMovie.duration_minutes && (
                <div className="d-flex justify-content-between gap-2 py-1 border-bottom border-secondary">
                  <dt className="text-secondary fw-normal">Duration</dt>
                  <dd className="mb-0">{showtimeMovie.duration_minutes} min</dd>
                </div>
              )}
              {showtimeMovie.age_rating && (
                <div className="d-flex justify-content-between gap-2 py-1 border-bottom border-secondary">
                  <dt className="text-secondary fw-normal">Age rating</dt>
                  <dd className="mb-0">{showtimeMovie.age_rating}</dd>
                </div>
              )}
              {showtimeMovie.start_time && (
                <div className="d-flex justify-content-between gap-2 py-1 border-bottom border-secondary">
                  <dt className="text-secondary fw-normal">Showtime</dt>
                  <dd className="mb-0 text-end">
                    {formatShowtime(showtimeMovie.start_time)}
                  </dd>
                </div>
              )}
              {showtimeMovie.ticket_price != null && (
                <div className="d-flex justify-content-between gap-2 py-1 border-bottom border-secondary">
                  <dt className="text-secondary fw-normal">Ticket</dt>
                  <dd className="mb-0">{showtimeMovie.ticket_price} €</dd>
                </div>
              )}
            </dl>

            <section className="mt-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h2 className="h6 mb-0">Selected seats</h2>
                <span
                  className="badge rounded-pill"
                  style={{ background: "var(--theme-red)" }}
                >
                  {selectedSeats.length}
                </span>
              </div>
              {selectedSeats.length > 0 ? (
                <div
                  className="d-flex flex-wrap gap-2 overflow-y-auto"
                  style={{ maxHeight: "92px" }}
                >
                  {[...selectedSeats]
                    .sort((a, b) => a - b)
                    .map((id) => {
                      const seat = seats.find((item) => item.id === id);
                      if (!seat) return null;
                      return (
                        <span
                          key={id}
                          className="badge rounded-pill border border-secondary fw-normal"
                        >
                          R{seat.row_number} · S{seat.seat_number}
                        </span>
                      );
                    })}
                </div>
              ) : (
                <p className="small text-secondary mb-0">
                  Choose seats from the map
                </p>
              )}
            </section>

            <div className="d-flex justify-content-between align-items-baseline mt-3 pt-3 border-top border-secondary">
              <span>Total</span>
              <strong className="fs-4" style={{ color: "var(--theme-gold)" }}>
                {formatPrice(calculatePrice(selectedSeats))} €
              </strong>
            </div>
            <button
              type="button"
              className="btn w-100 mt-3 text-white confirmSeatsButton"
              disabled={selectedSeats.length === 0 || isStartingPayment}
              onClick={() => openConfirmationModal()}
            >
              {isStartingPayment ? "Opening payment..." : "Continue"}
            </button>
            {paymentError && <p className="text-danger mt-3">{paymentError}</p>}
          </aside>
        </section>
      )}

      {showConfirmation && (
        <ConfirmSeatsModal
          showtime={{
            movieTitle: showtimeMovie?.title,
            startTime: showtimeMovie?.start_time,
            durationMinutes: showtimeMovie?.duration_minutes,
          }}
          formatShowtime={formatShowtime}
          formatEndTime={formatEndTime}
          seats={seats}
          selectedSeats={selectedSeats}
          customerName={customerName}
          email={email}
          onCustomerNameChange={(event) => setCustomerName(event.target.value)}
          onEmailChange={(event) => setEmail(event.target.value)}
          onConfirm={handlePayment}
          isStartingPayment={isStartingPayment}
          paymentError={paymentError}
          onClose={() => setShowConfirmation(false)}
        />
      )}
    </main>
  );
}
