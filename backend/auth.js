import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  throw new Error("JWT_SECRET must be set (at least 16 characters)");
}

export const ROLES = ["customer", "employee", "owner"];
export const STAFF_ROLES = ["employee", "owner"];

const COOKIE_NAME = "token";
const TOKEN_TTL_DAYS = 7;
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  // Set COOKIE_SECURE=true when the site is served over HTTPS (e.g. Rahti)
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
};

// Compared against when the email is unknown, so login takes the same time
// whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validates the fields shared by register and the owner's create-user route.
// Returns an error message, or null if everything is fine.
export function validateNewUser({ name, email, password }) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
    return "Name is required (max 100 characters)";
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 255) {
    return "A valid email is required";
  }
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters";
  }
  // bcrypt only uses the first 72 bytes of a password
  if (Buffer.byteLength(password) > 72) {
    return "Password must be at most 72 bytes";
  }
  return null;
}

export function createAuth(pool) {
  function setAuthCookie(res, userId) {
    const token = jwt.sign({ sub: String(userId) }, JWT_SECRET, {
      expiresIn: `${TOKEN_TTL_DAYS}d`,
    });
    res.cookie(COOKIE_NAME, token, {
      ...COOKIE_OPTIONS,
      maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
  }

  // The token only proves *who* the user is. Name and role are read from the
  // database on every request, so a role change or deleted account takes
  // effect immediately instead of when the token expires.
  async function getUserFromRequest(req) {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return null;

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
      return null;
    }

    const id = Number(payload.sub);
    if (!Number.isInteger(id)) return null;

    const { rows } = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = $1",
      [id],
    );
    return rows[0] ?? null;
  }

  async function requireAuth(req, res, next) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "Not logged in" });
    req.user = user;
    next();
  }

  // Use after requireAuth: app.post("/x", requireAuth, requireRole("owner"), ...)
  const requireRole = (...roles) =>
    (req, res, next) =>
      roles.includes(req.user?.role)
        ? next()
        : res.status(403).json({ error: "Forbidden" });

  const authRouter = Router();

  authRouter.post("/register", async (req, res) => {
    const { name, email, password } = req.body ?? {};
    const problem = validateNewUser({ name, email, password });
    if (problem) return res.status(400).json({ error: problem });

    const passwordHash = await bcrypt.hash(password, 10);
    try {
      // The role is never read from the request: public sign-up is always
      // a customer. Staff accounts are created by an owner (see admin.js).
      const { rows } = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'customer')
         RETURNING id, name, email, role`,
        [name.trim(), email.trim().toLowerCase(), passwordHash],
      );
      setAuthCookie(res, rows[0].id);
      res.status(201).json({ user: rows[0] });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "Email is already registered" });
      }
      throw error;
    }
  });

  authRouter.post("/login", async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { rows } = await pool.query(
      "SELECT id, name, email, role, password_hash FROM users WHERE email = $1",
      [email.trim().toLowerCase()],
    );
    const user = rows[0];

    const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    setAuthCookie(res, user.id);
    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  });

  authRouter.post("/logout", (_req, res) => {
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
    res.json({ ok: true });
  });

  // Returns { user: null } (HTTP 200) when nobody is logged in, so the
  // frontend can call it on every page load without a red 401 in the console.
  authRouter.get("/me", async (req, res) => {
    const user = await getUserFromRequest(req);
    res.json({ user });
  });

  return { authRouter, requireAuth, requireRole };
}
