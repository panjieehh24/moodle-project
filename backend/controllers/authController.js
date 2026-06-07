const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/connection");
const { logAudit, clientIp } = require("../utils/audit");

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const [rows] = await pool.query(
      "SELECT id, name, email, password, role FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    // Record the sign-in (last_login_at powers the admin user list; the audit
    // entry powers the audit-log viewer). Best-effort — never block login.
    pool.query("UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?", [user.id])
      .catch((e) => console.error("last_login update failed:", e.code || e.message));
    logAudit({ userId: user.id, action: "login", entityType: "user", entityId: user.id, ip: clientIp(req) });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, bio, phone, avatar_url, last_login_at, created_at
         FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/auth/me — update the current user's own profile
async function updateMe(req, res, next) {
  try {
    const { name, bio, phone, password } = req.body;
    const fields = [], vals = [];
    if (name !== undefined && name !== "") { fields.push("name = ?");  vals.push(name); }
    if (bio !== undefined)                 { fields.push("bio = ?");   vals.push(bio); }
    if (phone !== undefined)               { fields.push("phone = ?"); vals.push(phone); }
    if (password)                          { fields.push("password = ?"); vals.push(await bcrypt.hash(password, 10)); }
    if (fields.length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }
    vals.push(req.user.id);
    await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, vals);
    res.json({ message: "Profile updated" });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me, updateMe };
