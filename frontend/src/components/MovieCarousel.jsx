import { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import "./MovieCarousel.css";

export default function MovieCarousel({ movies }) {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [updateArrows, movies]);

  function scrollByPage(direction) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  }

  return (
    <section className="movie-carousel" aria-label="Nyt teattereissa">
      <button
        className="carousel-arrow"
        onClick={() => scrollByPage(-1)}
        disabled={!canScrollLeft}
        aria-label="Edelliset elokuvat"
      >
        &#10094;
      </button>

      <div className="carousel-track" ref={trackRef} onScroll={updateArrows}>
        {movies.map((movie) => (
          <Link
            key={movie.id}
            to={`/movies/${movie.id}`}
            className="carousel-item"
            title={movie.title}
          >
            {movie.poster ? (
              <img src={movie.poster} alt={movie.title} draggable="false" />
            ) : (
              <div className="carousel-placeholder">{movie.title}</div>
            )}
          </Link>
        ))}
      </div>

      <button
        className="carousel-arrow"
        onClick={() => scrollByPage(1)}
        disabled={!canScrollRight}
        aria-label="Seuraavat elokuvat"
      >
        &#10095;
      </button>
    </section>
  );
}
