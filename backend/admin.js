import { Router } from "express";
import bcrypt from "bcryptjs";
import { ROLES, STAFF_ROLES, validateNewUser } from "./auth.js";

// Owner-only user management. Mounted at /api/admin.
export function createAdminRouter(pool, requireAuth, requireRole) {
  const router = Router();

  // Everything below this line requires a logged-in owner.
  router.use(requireAuth, requireRole("owner"));

  // List all accounts
  router.get("/users", async (_req, res) => {
    const { rows } = await pool.query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY id",
    );
    res.json(rows);
  });

  // Create an employee or owner account
  router.post("/users", async (req, res) => {
    const { name, email, password, role } = req.body ?? {};

    const problem = validateNewUser({ name, email, password });
    if (problem) return res.status(400).json({ error: problem });
    if (!STAFF_ROLES.includes(role)) {
      return res
        .status(400)
        .json({ error: `Role must be one of: ${STAFF_ROLES.join(", ")}` });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role, created_at`,
        [name.trim(), email.trim().toLowerCase(), passwordHash, role],
      );
      res.status(201).json({ user: rows[0] });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "Email is already registered" });
      }
      throw error;
    }
  });

  // Change someone's role (promote a customer, demote an employee, ...)
  router.patch("/users/:id/role", async (req, res) => {
    const id = Number(req.params.id);
    const { role } = req.body ?? {};

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "User ID must be an integer" });
    }
    if (!ROLES.includes(role)) {
      return res
        .status(400)
        .json({ error: `Role must be one of: ${ROLES.join(", ")}` });
    }
    // Stops the last owner from locking everyone out of the admin features
    if (id === req.user.id) {
      return res.status(400).json({ error: "You can't change your own role" });
    }

    const { rows } = await pool.query(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, name, email, role`,
      [role, id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user: rows[0] });
  });

  return router;
}
