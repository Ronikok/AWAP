// Runs the TMDB movie import manually
import pg from "pg";
import { importMoviesFromTMDB } from "./tmdbImport.js";

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || "db",
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "appdb",
});

try {
  const result = await importMoviesFromTMDB(pool);
  console.log(`TMDB import completed: ${result.imported} movies processed.`);
} catch (error) {
  console.error("TMDB import failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}