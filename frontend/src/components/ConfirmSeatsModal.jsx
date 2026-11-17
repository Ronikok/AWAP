export default function ConfirmSeatsModal({
  showtime,
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
  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal show d-block confirmSeatsModal" tabIndex="-1">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Confirm selection</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <p className="confirmSeatsModal__showtime">
              Showtime: {showtime.movieTitle} at {showtime.startTime}
            </p>
            <p className="confirmSeatsModal__seats">
              Selected seats: {selectedSeats.join(", ")}
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
              />
            </div>
            <div className="mb-3">
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
              />
            </div>
            {paymentError && (
              <p className="text-danger mb-0" role="alert">
                {paymentError}
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn confirmSeatsModal__accountButton"
              onClick={onClose}
            >
              Login / Sign up
            </button>
            <button
              type="button"
              className="btn confirmSeatsModal__paymentButton"
              disabled={!customerName.trim() || !email || isStartingPayment}
              onClick={onConfirm}
            >
              {isStartingPayment ? "Opening payment..." : "Continue to payment"}
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
