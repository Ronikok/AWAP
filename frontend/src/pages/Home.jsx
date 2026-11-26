import { useEffect, useState } from "react";
import MovieCarousel from "../components/MovieCarousel.jsx";
import "./Home.css";

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [error, setError] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  
  useEffect(() => {
    async function loadMovies() {
      try {
        const response = await fetch("/api/movies/featured");

        if (!response.ok) {
          throw new Error("Failed to load movies");
        }

        const data = await response.json();

        setMovies(
          data.map((movie) => ({
            ...movie,
            poster: movie.image_url,
          }))
        );
      } catch (err) {
        console.error(err);
        setError("Elokuvien lataaminen epäonnistui.");
      }
    }

    loadMovies();
  }, []);

  async function handleBookingSubmit(event) {
    event.preventDefault();

    if (bookingSubmitting) return;

    setBookingSubmitting(true);
    setBookingMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const bookingData = {
      company_name: formData.get("company_name"),
      contact_name: formData.get("contact_name"),
      contact_email: formData.get("contact_email"),
      city: formData.get("city"),
      preferred_date: formData.get("preferred_date"),
      guest_count: Number(formData.get("guest_count")),
      additional_requests: formData.get("additional_requests"),
    };

    try {
      const response = await fetch("/api/company-bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        throw new Error("Failed to submit booking request");
      }

      setBookingMessage(
        "Your booking request has been sent! Rio Cinema will contact you to confirm the details."
      );

      form.reset();
    } catch (err) {
      console.error(err);
      setBookingMessage(
        "Something went wrong. Please try again."
      );
    } finally {
      setBookingSubmitting(false);
    }
  }

  return (
    <div>
      {error && <p>{error}</p>}
      <MovieCarousel movies={movies} />
        <section className="home-about">
          <h1>Welcome to Rio Cinema</h1>

          <p>
            Rio Cinema is a family-owned movie theater with locations in
            Oulu and Tampere. As a small, independent cinema business,
            we believe that going to the movies should be more than
            just watching a film.
          </p>

          <p>
            We offer a welcoming atmosphere where you can enjoy the
            latest movies with friends and family. Whether you're
            planning a movie night or looking for something special,
            we're here to make your cinema experience memorable.
          </p>

          <div className="home-cinemas">
            <div className="home-cinema">
              <h2>Rio Oulu</h2>
                <p>Kauppurienkatu 45, Oulu</p>
                <p>2 auditoriums · 100 and 200 seats</p>
                  <a href="/oulu">View Showtimes</a>
            </div>

            <div className="home-cinema">
              <h2>Rio Tampere</h2>
                <p>Hämeenkatu 27, Tampere</p>
                <p>2 auditoriums · 100 and 200 seats</p>
                  <a href="/tampere">View Showtimes</a>
            </div>
          </div>
        </section>

        <section className="home-corporate">
          <h2>Corporate Bookings & Private Screenings</h2>

          <p>
            Looking for a unique way to celebrate your company Christmas
            party, team-building event, or staff gathering?
          </p>

          <p>   
            At Rio Cinema, companies can book an entire auditorium for
            a private movie screening in Oulu or Tampere. Enjoy a
            memorable movie experience with your colleagues in
            your own private cinema.
          </p>
          
          <button
            type="button"
            className="corporate-button"
            onClick={() => setShowBookingForm(!showBookingForm)}
            aria-expanded={showBookingForm}
          >
            {showBookingForm
              ? "Close Booking Form"
              : "Request a Private Screening"}
          </button>
          {showBookingForm && (
            <form className="corporate-form" onSubmit={handleBookingSubmit}>
              <h3>Private Screening Request</h3>

              <label htmlFor="company-name">Company Name</label>
              <input
                id="company-name"
                name="company_name"
                type="text"
                placeholder="Enter your company name"
                required 
              />

              <label htmlFor="contact-name">Contact Person</label>
              <input
                id="contact-name"
                name="contact_name"
                type="text"
                placeholder="Your full name"
                required
              />

              <label htmlFor="contact-email">Email Address</label>
              <input
                id="contact-email"
                name="contact_email"
                type="email"
                placeholder="name@company.com"
                required
              />

              <label htmlFor="cinema-location">Preferred Cinema</label>
              <select id="cinema-location" name="city" required defaultValue="">
                <option value="" disabled>
                  Select a cinema
                </option>
                <option value="Oulu">Rio Oulu</option>
                <option value="Tampere">Rio Tampere</option>
              </select>

              <label htmlFor="event-date">Preferred Date</label>
              <input
                id="event-date"
                name="preferred_date"
                type="date"
                required
              />

              <label htmlFor="guest-count">Number of Guests</label>
              <input
                id="guest-count"
                name="guest_count"
                type="number"
                min="1"
                max="200"
                placeholder="e.g. 50"
                required
              />

              <label htmlFor="event-details">Additional Requests</label>
              <textarea
                id="event-details"
                name="additional_requests"
                rows="4"
                placeholder="Preferred movie, event details, or other requests..."
              />

              <p>
                This is a booking inquiry. Your reservation will only be
                confirmed after Rio Cinema contacts you.
              </p>

              <button
                type="submit"
                className="corporate-button"
                disabled={bookingSubmitting}
              >
                {bookingSubmitting ? "Sending..." : "Send Booking Request"}
              </button>
              {bookingMessage && (
                <p role="status" aria-live="polite" className="booking-message">
                  {bookingMessage}
                </p>
              )}
            </form>
          )}
        </section>
    </div>
  );
}
