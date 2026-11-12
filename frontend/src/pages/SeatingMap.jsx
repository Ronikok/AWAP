import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { seats } from "../src/data/seats";
import { fetchShowtimeById } from "../api";
import "../assets/seatingMap.css";

export default function SeatingMap() {
  const { id } = useParams();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [showtimeMovie, setShowtimeMovie] = useState(null);
  const [showtimeError, setShowtimeError] = useState("");

  useEffect(() => {
    let active = true;

    fetchShowtimeById(id)
      .then((showtime) => {
        if (active) {
          setShowtimeMovie({
            ...showtime,
            poster: showtime.image_url,
          });
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

  function toggleSeat(id) {
    setSelectedSeats((current) =>
      current.includes(id)
        ? current.filter((seatId) => seatId !== id)
        : [...current, id],
    );
  }

  function calculatePrice(seats) {
    const ticketPriceCents = Math.round(
      Number(showtimeMovie?.ticket_price || 0) * 100,
    );
    const discountedSeats = Math.floor(seats.length / 10);
    const finalPriceCents =
      seats.length * ticketPriceCents -
      discountedSeats * Math.round(ticketPriceCents / 2);

    return finalPriceCents / 100;
  }

  function formatPrice(price) {
    return price.toFixed(2);
  }

  function getSeatPosition(id) {
    return {
      row: Math.floor((id - 1) / 10) + 1,
      seat: ((id - 1) % 10) + 1,
    };
  }

  function createSeatingMap(capacity) {
    const seatsToDisplay = seats.slice(0, capacity);

    return Array.from(
      { length: Math.ceil(seatsToDisplay.length / 10) },
      (_, rowIndex) => (
        <div key={rowIndex} className="seatingRow">
          {seatsToDisplay
            .slice(rowIndex * 10, rowIndex * 10 + 10)
            .map((seat) => {
              const isSelected = selectedSeats.includes(seat.id);
              if (seat.id === 13) {
                seat.id = "VIP";
              }

              return (
                <button
                  key={seat.id}
                  type="button"
                  className="d-flex justify-content-center align-items-center rounded border-0"
                  aria-pressed={isSelected}
                  disabled={seat.is_client_reserved}
                  onClick={() => toggleSeat(seat.id)}
                  style={{
                    background: isSelected ? "var(--theme-gold)" : "#006D1D",
                    height: "48px",
                    width: "48px",
                    color: "white",
                    margin: "8px",
                    padding: 0,
                  }}
                >
                  <p className="m-0">{seat.id}</p>
                </button>
              );
            })}
        </div>
      ),
    );
  }

  return (
    <>
      {!showtimeMovie && !showtimeError && <p>Loading showtime...</p>}
      {showtimeError && <p className="text-danger">{showtimeError}</p>}
      {showtimeMovie && (
        <div className="container">
          <div className="row align-items-start g-4 border border-red rounded p-3 mx-0 my-3">
            <div className="col-lg-8">
              <div id="mapWrapper" className="row justify-content-center">
                <div
                  className="text-center col rounded"
                  style={{
                    background: "#212529",
                    margin: "16px auto 50px",
                    padding: "12px",
                    flex: "0 0 80%",
                  }}
                >
                  SCREEN
                </div>
                <div
                  className="d-flex justify-content-center overflow-hidden"
                  style={{ width: "100%", overflowX: "auto" }}
                >
                  <div
                    className="border border-red d-flex flex-column justify-content-center align-items-center flex-shrink-0"
                    id="walkway-left"
                    style={{ width: "100px" }}
                  >
                    <div className="d-flex flex-column align-items-center">
                      <span aria-label="In">&#8593;</span>
                      <span>In</span>
                    </div>
                    <div className="d-flex flex-column align-items-center">
                      <span>Out</span>
                      <span aria-label="Out">&#8595;</span>
                    </div>
                  </div>
                  <div
                    id="seatingwrapper"
                    className="text-center overflow-visible flex-shrink-0"
                  >
                    {createSeatingMap(200)}
                  </div>
                  <div
                    className="border border-red d-flex flex-column justify-content-center align-items-center flex-shrink-0"
                    id="walkway-right"
                    style={{ width: "100px" }}
                  >
                    <div className="d-flex flex-column align-items-center">
                      <span aria-label="In">&#8593;</span>
                      <span>In</span>
                    </div>
                    <div className="d-flex flex-column align-items-center">
                      <span>Out</span>
                      <span aria-label="Out">&#8595;</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <aside className="col-lg-4">
              <div className="p-4 h-100">
                {showtimeMovie.poster && (
                  <div className="posterWrapper">
                    <img src={showtimeMovie.poster} alt={showtimeMovie.title} />
                  </div>
                )}
                {!showtimeMovie.poster && (
                  <div
                    className="rounded mb-3 d-flex align-items-center justify-content-center"
                    style={{
                      height: "240px",
                      background: "#212529",
                      color: "white",
                    }}
                  >
                    {showtimeMovie.title}
                  </div>
                )}
                <h2 className="h4">{showtimeMovie.title}</h2>
                {showtimeMovie.description && (
                  <p>{showtimeMovie.description}</p>
                )}
                {showtimeMovie.duration_minutes && (
                  <p className="mb-1">
                    Duration: {showtimeMovie.duration_minutes} min
                  </p>
                )}
                {showtimeMovie.age_rating && (
                  <p className="mb-1">Age rating: {showtimeMovie.age_rating}</p>
                )}
                {showtimeMovie.start_time && (
                  <p className="mb-1">
                    {formatShowtime(showtimeMovie.start_time)}
                  </p>
                )}
                {showtimeMovie.ticket_price != null && (
                  <p className="mb-1">
                    Ticket price: {showtimeMovie.ticket_price} €
                  </p>
                )}
                <hr />
                <h3 className="h5">Selected seats</h3>
                {selectedSeats.length > 0 ? (
                  <div>
                    <div className="selectedList">
                      <ul className="p-0">
                        {[...selectedSeats]
                          .sort((a, b) => a - b)
                          .map((id) => {
                            const position = getSeatPosition(id);

                            return (
                              <li key={id} className="list-group-item">
                                Row {position.row}, seat {id}
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                    {selectedSeats.length > 20 ? (
                      <p>and {selectedSeats.length - 20} more</p>
                    ) : null}{" "}
                  </div>
                ) : (
                  <p>No seats selected</p>
                )}
                <p className="mb-0">
                  Total seats: <strong>{selectedSeats.length}</strong>
                </p>
                <p className="mb-0">
                  Total price:{" "}
                  <strong>{formatPrice(calculatePrice(selectedSeats))}€</strong>
                </p>
                <button
                  type="button"
                  className="btn confirmSeatsButton px-2 mt-3"
                >
                  Confirm seats
                </button>
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
