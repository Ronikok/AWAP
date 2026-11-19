// Creates (or promotes) an account from the command line. Use it to make the
// first owner, since public registration only ever creates customers.
//
//   node createUser.js <email> <password> "<name>" <customer|employee|owner>
//
// If the email already exists, only its role is updated (password is kept).
import bcrypt from "bcryptjs";
import pg from "pg";

const ROLES = ["customer", "employee", "owner"];
const [email, password, name, role] = process.argv.slice(2);

if (!email || !password || !name || !ROLES.includes(role)) {
  console.error(
    'Usage: node createUser.js <email> <password> "<name>" <customer|employee|owner>',
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters");
  process.exit(1);
}

const pool = new pg.Pool({
  host: process.env.DB_HOST || "db",
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "appdb",
});

try {
  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
     RETURNING id, name, email, role`,
    [name, email.toLowerCase(), passwordHash, role],
  );
  console.log("Done:", rows[0]);
} catch (error) {
  console.error("Failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
