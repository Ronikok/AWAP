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

app.get("/api/healthz", (req, res) => res.json({ status: "ok" }));
app.get("/api/readyz", (req, res) => res.json({ status: "ready" }));
app.get("/api/health", (req, res) =>
  res.json({ message: "AWAP API version 1.0.1" }),
);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "internal server error" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Backend listening on port ${port}`);
});
