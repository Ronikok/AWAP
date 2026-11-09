import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

const app = express();
const port = Number(process.env.PORT || 8000);

const pool = new Pool({
  host: process.env.DB_HOST || "db",
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "appdb",
});

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:8080",
      "http://127.0.0.1:8080",
    ],
  }),
);

app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));
app.get("/api/readyz", (_req, res) => res.json({ status: "ready" }));
app.get("/api/health", (_req, res) =>
  res.json({ message: "AWAP API version 1.0.1" }),
);

app.get("/api/dbtest", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: `Database connection successful: ${result.rows[0].now}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.get("/api/dbTables", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    res.json({
      tables: result.rows.map((row) => row.table_name),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch database tables" });
  }
});

app.get("api/getRoomCapacity", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT capacity FROM rooms WHERE id = ${req}`,
    );
    res.status(200).json({ result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.use((error, _req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "internal server error" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Backend listening on port ${port}`);
});
