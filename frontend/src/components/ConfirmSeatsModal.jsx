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
  isStartingPayment,
  paymentError,
  onClose,
}) {
  const [page, setPage] = useState(1);
  const { user } = useAuth();

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
                      page === 2 ? "is-active" : ""
                    }`}
                  >
                    2. Your details
                  </span>
                </div>
                <h5 className="modal-title mt-3">
                  {page === 1 ? "Review your booking" : "Your details"}
                </h5>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              {page === 1 ? (
                <>
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
                </>
              ) : (
                <>
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
                      <span>Want to save your tickets?</span>
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
                </>
              )}
            </div>
            <div className="modal-footer">
              {page === 2 && (
                <button
                  type="button"
                  className="btn confirmSeatsModal__backButton"
                  onClick={() => setPage(1)}
                  disabled={isStartingPayment}
                >
                  Back
                </button>
              )}
              {page === 1 ? (
                <button
                  type="button"
                  className="btn confirmSeatsModal__paymentButton"
                  onClick={() => setPage(2)}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  className="btn confirmSeatsModal__paymentButton"
                  disabled={!customerName.trim() || !email || isStartingPayment}
                  onClick={onConfirm}
                >
                  {isStartingPayment
                    ? "Opening payment..."
                    : "Continue to payment"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
