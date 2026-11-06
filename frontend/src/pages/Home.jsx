import MovieCarousel from "../components/MovieCarousel.jsx";
import { movies } from "../src/data/movies.js";

export default function Home() {
  return (
    <div>
      <MovieCarousel movies={movies} />
      <h1>Home Page</h1>
      <p>This is the home page content.</p>
    </div>
  );
}
