import { useEffect, useState } from "react";
import "./CinemaPage.css";

export default function CinemaPage({ city }) {
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadShowtimes() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/showtimes?city=${encodeURIComponent(city)}`
        );

        if (!response.ok) {
          throw new Error("Failed to load showtimes");
        }

        const data = await response.json();

        setShowtimes(
          data.filter(
            (showtime) => new Date(showtime.start_time) > new Date()
          )
        );
      } catch (err) {
        console.error(err);
        setError("Näytösten lataaminen epäonnistui.");
      } finally {
        setLoading(false);
      }
    }

    loadShowtimes();
  }, [city]);

    const dates = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + index);
        return date;
    });

    const [selectedDate, setSelectedDate] = useState(
        new Date().toDateString()
    );

  return (
    <main className="cinema-page">
      <h1>Ohjelmisto – Cinema RIO {city}</h1>
      <h2>Tulevat näytökset</h2>

<div className="cinema-dates">
  {dates.map((date) => (
    <button
      key={date.toDateString()}
      type="button"
      className={
        selectedDate === date.toDateString()
          ? "cinema-date active"
          : "cinema-date"
      }
      onClick={() => setSelectedDate(date.toDateString())}
    >
      {date.toLocaleDateString("fi-FI", {
        weekday: "short",
        day: "numeric",
        month: "numeric",
      })}
    </button>
  ))}
</div>


      {loading && <p>Ladataan näytöksiä...</p>}
      {error && <p>{error}</p>}

      {!loading && !error && showtimes.length === 0 && (
        <p className="cinema-empty">Ei tulevia näytöksiä.</p>
      )}

      {showtimes.map((showtime) => (
        <div key={showtime.id}>
          <h3>{showtime.title}</h3>

          {showtime.image_url && (
            <img
              src={showtime.image_url}
              alt={showtime.title}
              width="150"
            />
          )}

          <p>
            {new Date(showtime.start_time).toLocaleString("fi-FI")}
          </p>

          <p>Hinta: {showtime.ticket_price} €</p>
        </div>
      ))}
    </main>
  );
}
