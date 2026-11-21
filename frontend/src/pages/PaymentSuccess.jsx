import { useSearchParams, Link } from "react-router";
import { getTicketUrl } from "../api";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get("reservation_id");
  const sessionId = searchParams.get("session_id");
  const ticketUrl =
    reservationId && sessionId ? getTicketUrl(reservationId, sessionId) : null;

  return (
    <main className="paymentStatusPage">
      <section className="paymentStatusCard" role="status">
        <p className="paymentStatusEyebrow">Payment successful</p>
        <h1>Thank you for your purchase</h1>
        <p className="paymentStatusText">
          Your seats have been reserved. A confirmation will be sent to your
          email.
        </p>
        {reservationId && (
          <p className="paymentStatusReference">
            Reservation reference: <strong>#{reservationId}</strong>
          </p>
        )}
        <div className="d-flex justify-content-center flex-wrap gap-2">
          {ticketUrl && (
            <a href={ticketUrl} className="btn paymentStatusButton" download>
              Download ticket
            </a>
          )}
          <Link to="/" className="btn btn-outline-light">
            Return to home
          </Link>
        </div>
      </section>
    </main>
  );
}
