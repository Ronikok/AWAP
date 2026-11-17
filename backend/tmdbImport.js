// Imports popular movies from TMDB into PostgreSQL
export async function importMoviesFromTMDB(pool) {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;

  if (!token) {
    throw new Error("TMDB token is not configured");
  }

  const response = await fetch(
    "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }

  const data = await response.json();
  let imported = 0;

  for (const movie of data.results) {
    const detailsResponse = await fetch(
      `https://api.themoviedb.org/3/movie/${movie.id}?language=en-US`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "application/json",
        },
      },
    );

    if (!detailsResponse.ok) {
      throw new Error(`Failed to fetch movie ${movie.id}`);
    }

    const details = await detailsResponse.json();

    await pool.query(
      `INSERT INTO movies (
        tmdb_id,
        title,
        duration_minutes,
        image_url,
        description
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (tmdb_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        duration_minutes = EXCLUDED.duration_minutes,
        image_url = EXCLUDED.image_url,
        description = EXCLUDED.description`,
      [
        movie.id,
        movie.title,
        details.runtime || 60,
        movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : null,
        movie.overview,
      ],
    );

    imported++;
  }

  return { imported };
}