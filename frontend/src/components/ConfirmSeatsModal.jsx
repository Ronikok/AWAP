import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function ConfirmSeatsModal({
  showtime,
  formatShowtime,
  formatEndTime,
  seats,
  selectedSeats,
  customerName,
  email,
  onCustomerNameChange,
  onEmailChange,
  onConfirm,
  isProcessing,
  paymentError,
  onClose,
  onReserve,
}) {
  const [page, setPage] = useState(1);
  const [ticketCounts, setTicketCounts] = useState({ normal: 0, child: 0 });
  const { user, loading } = useAuth();
  const ticketPriceCents = Math.round(Number(showtime.ticketPrice || 0) * 100);
  const childDiscountCents =
    ticketCounts.child * (ticketPriceCents - Math.round(ticketPriceCents / 2));
  const tenthTicketDiscountCount = Math.floor(selectedSeats.length / 10);
  const normalDiscountCount = Math.min(
    tenthTicketDiscountCount,
    ticketCounts.normal,
  );
  const childDiscountCount = tenthTicketDiscountCount - normalDiscountCount;
  const tenthTicketDiscountCents =
    normalDiscountCount * Math.round(ticketPriceCents / 2) +
    childDiscountCount *
      Math.round(Math.round(ticketPriceCents / 2) / 2);
  const totalCents =
    selectedSeats.length * ticketPriceCents -
    childDiscountCents -
    tenthTicketDiscountCents;

  function changeTicketCount(type, amount) {
    setTicketCounts((counts) => {
      const nextCount = counts[type] + amount;
      const total = counts.normal + counts.child + amount;
      if (nextCount < 0 || total > selectedSeats.length) return counts;
      return { ...counts, [type]: nextCount };
    });
  }

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal show d-block confirmSeatsModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <div className="w-100">
                <div
                  className="d-flex align-items-center gap-2 small text-secondary"
                  aria-label="Booking progress"
                >
                  <span
                    className={`confirmSeatsModal__progressStep ${
                      page === 1 ? "is-active" : "is-complete"
                    }`}
                  >
                    1. Review booking
                  </span>
                  <span className="flex-grow-1 border-top border-secondary"></span>
                  <span
                    className={`confirmSeatsModal__progressStep ${
                      page === 2 || page === "3a" || page === "3b"
                        ? "is-active"
                        : ""
                    }`}
                  >
                    2. Your details
                  </span>
                  <span className="flex-grow-1 border-top border-secondary"></span>
                  <span
                    className={`confirmSeatsModal__progressStep ${
                      page === "3a" || page === "3b" ? "is-active" : ""
                    }`}
                  >
                    3. Confirm booking
                  </span>
                </div>
                <h5 className="modal-title mt-3">
                  {page === 1
                    ? "Review your booking"
                    : page === 2
                      ? "Your details"
                      : "Confirm booking"}
                </h5>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
            {page === 1 && (
              <>
                <div className="modal-body">
                  <div className="pb-3 border-bottom border-secondary">
                    <h2 className="h5">{showtime.movieTitle}</h2>
                    <p className="confirmSeatsModal__showtime mb-0">
                      {formatShowtime(showtime.startTime)} - {formatEndTime()}
                    </p>
                  </div>
                  <div className="mt-3 p-3 rounded border-start border-3 border-danger">
                    <p className="mb-2">Selected seats</p>
                    <div className="d-flex flex-wrap gap-2">
                      {[...selectedSeats]
                        .sort((a, b) => a - b)
                        .map((seatId) => {
                          const seat = seats.find((item) => item.id === seatId);
                          if (!seat) return null;

                          return (
                            <span
                              key={seatId}
                              className="badge rounded-pill border border-secondary fw-normal"
                            >
                              Row {seat.row_number}, seat{" "}
                              {seat.seat_number === 13
                                ? "VIP"
                                : seat.seat_number}
                            </span>
                          );
                        })}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="mb-2">Choose a ticket type for each seat</p>
                    {[
                      ["normal", "Normal tickets"],
                      ["child", "Child tickets (12 and under)"],
                    ].map(([type, label]) => (
                      <div
                        key={type}
                        className="d-flex align-items-center justify-content-between py-2"
                      >
                        <span>{label}</span>
                        <div className="d-flex align-items-center gap-3">
                          <button
                            type="button"
                            className="btn btn-outline-secondary p-0"
                            style={{ width: "2.5rem", height: "2.5rem" }}
                            aria-label={`Add ${label.toLowerCase()}`}
                            disabled={
                              ticketCounts.normal + ticketCounts.child === 0 ||
                              ticketCounts[type] === 0
                            }
                            onClick={() => changeTicketCount(type, -1)}
                          >
                            -
                          </button>
                          <span aria-live="polite">{ticketCounts[type]}</span>
                          <button
                            type="button"
                            className="btn btn-outline-secondary p-0"
                            style={{ width: "2.5rem", height: "2.5rem" }}
                            aria-label={`Remove ${label.toLowerCase()}`}
                            disabled={
                              ticketCounts[type] >= selectedSeats.length ||
                              ticketCounts.normal + ticketCounts.child >=
                                selectedSeats.length
                            }
                            onClick={() => changeTicketCount(type, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                    <p className="small text-secondary mb-0">
                      {ticketCounts.normal + ticketCounts.child} of{" "}
                      {selectedSeats.length} seats assigned
                    </p>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn confirmSeatsModal__paymentButton"
                    disabled={
                      ticketCounts.normal + ticketCounts.child !==
                      selectedSeats.length
                    }
                    onClick={() => setPage(2)}
                  >
                    Continue
                  </button>
                </div>
              </>
            )}
            {page === 2 && (
              <>
                <div className="modal-body">
                  <div className="mt-3">
                    <p className="confirmSeatsModal__formTitle fw-semibold">
                      Enter your details to continue
                    </p>
                    <div className="mb-3">
                      <label htmlFor="customer-name" className="form-label">
                        Full name
                      </label>
                      <input
                        id="customer-name"
                        type="text"
                        className="form-control"
                        placeholder="Enter your full name"
                        value={customerName}
                        maxLength={100}
                        onChange={onCustomerNameChange}
                        disabled={Boolean(user)}
                      />
                    </div>
                    <div className="mb-0">
                      <label htmlFor="customer-email" className="form-label">
                        Email address
                      </label>
                      <input
                        id="customer-email"
                        type="email"
                        className="form-control"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={onEmailChange}
                        disabled={Boolean(user)}
                      />
                    </div>
                  </div>
                  {!user ? (
                    <div className="d-flex justify-content-center align-items-center flex-wrap gap-2 mt-3 pt-3 border-top border-secondary small text-secondary">
                      <span>Want to pay later? You must first </span>
                      <Link
                        to="/login"
                        className="confirmSeatsModal__loginLink"
                      >
                        Log in
                      </Link>
                      <span className="confirmSeatsModal__accountDivider">
                        or
                      </span>
                      <Link
                        to="/register"
                        className="confirmSeatsModal__loginLink"
                      >
                        Sign up
                      </Link>
                    </div>
                  ) : null}
                  {paymentError && (
                    <p className="text-danger mb-0" role="alert">
                      {paymentError}
                    </p>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn confirmSeatsModal__backButton"
                    onClick={() => setPage(1)}
                    disabled={isProcessing}
                  >
                    Back
                  </button>
                  {user && !loading && (
                    <button
                      type="button"
                      className="btn confirmSeatsModal__reserveButton"
                      onClick={() => setPage("3a")}
                      disabled={isProcessing}
                    >
                      Reserve
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn confirmSeatsModal__paymentButton"
                    disabled={!customerName.trim() || !email || isProcessing}
                    onClick={() => onConfirm(ticketCounts)}
                  >
                    {isProcessing ? "Processing..." : "Buy now"}
                  </button>
                </div>
              </>
            )}
            {page === "3a" && (
              <>
                <div className="modal-body">
                  <div className="pb-3 border-bottom border-secondary">
                    <h2 className="h5">{showtime.movieTitle}</h2>
                    <p className="confirmSeatsModal__showtime mb-0">
                      {formatShowtime(showtime.startTime)} - {formatEndTime()}
                    </p>
                    <p className="mb-0">
                      {showtime.theatreName}
                      {showtime.city ? `${showtime.city}` : ""}
                    </p>
                  </div>
                  <div className="mt-3">
                    <h3 className="h6">Seats and ticket types</h3>
                    <ul className="list-unstyled mb-0">
                      {selectedSeats.map((seatId, index) => {
                        const seat = seats.find((item) => item.id === seatId);
                        if (!seat) return null;

                        return (
                          <li
                            key={seatId}
                            className="d-flex justify-content-between py-1"
                          >
                            <span>
                              Row {seat.row_number}, seat {seat.seat_number}
                            </span>
                            <span>
                              {index < ticketCounts.normal ? "Normal" : "Child"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="mt-3 pt-3 border-top border-secondary">
                    <h3 className="h6">Price</h3>
                    <div className="d-flex justify-content-between">
                      <span>
                        {ticketCounts.normal} normal tickets ×{" "}
                        {(ticketPriceCents / 100).toFixed(2)} €
                      </span>
                      <span>
                        {(
                          (ticketCounts.normal * ticketPriceCents) /
                          100
                        ).toFixed(2)}{" "}
                        €
                      </span>
                    </div>
                    {ticketCounts.child > 0 && (
                      <>
                        <div className="d-flex justify-content-between">
                          <span>
                            {ticketCounts.child} child tickets ×{" "}
                            {(ticketPriceCents / 100).toFixed(2)} €
                          </span>
                          <span>
                            {(
                              (ticketCounts.child * ticketPriceCents) /
                              100
                            ).toFixed(2)}{" "}
                            €
                          </span>
                        </div>
                        <div className="d-flex justify-content-between text-success">
                          <span>Child discount (50%)</span>
                          <span>
                            -{(childDiscountCents / 100).toFixed(2)} €
                          </span>
                        </div>
                      </>
                    )}
                    {tenthTicketDiscountCents > 0 && (
                      <div className="d-flex justify-content-between text-success">
                        <span>10th ticket discount (-50%)</span>
                        <span>
                          -{(tenthTicketDiscountCents / 100).toFixed(2)} €
                        </span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between mt-2 fw-semibold">
                      <span>Total</span>
                      <span>{(totalCents / 100).toFixed(2)} €</span>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn confirmSeatsModal__backButton"
                    onClick={() => setPage(2)}
                    disabled={isProcessing}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn confirmSeatsModal__reserveButton"
                    onClick={() => onReserve(ticketCounts)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Confirm"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
