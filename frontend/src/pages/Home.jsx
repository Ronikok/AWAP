import { useEffect, useState } from "react";
import MovieCarousel from "../components/MovieCarousel.jsx";

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMovies() {
      try {
        const response = await fetch("/api/movies");

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

  return (
    <div>
      {error && <p>{error}</p>}
      <MovieCarousel movies={movies} />
      <h1>Home Page</h1>
      <p>This is the home page content.</p>
    </div>
  );
}
