const pool = require("../db/connection");
const bcrypt = require("bcryptjs");
const { logAudit, clientIp } = require("../utils/audit");

// GET /api/v1/admin/stats — counts for the admin dashboard
async function stats(req, res, next) {
  try {
    const [[u]] = await pool.query("SELECT COUNT(*) n FROM users");
    const [[c]] = await pool.query("SELECT COUNT(*) n FROM courses");
    const [[e]] = await pool.query("SELECT COUNT(*) n FROM enrollments");
    const [[s]] = await pool.query("SELECT COUNT(*) n FROM submissions");
    const [byRole] = await pool.query(
      "SELECT role, COUNT(*) n FROM users GROUP BY role"
    );
    res.json({ users: u.n, courses: c.n, enrollments: e.n, submissions: s.n, byRole });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/users
async function listUsers(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, is_active, last_login_at, created_at
         FROM users ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/admin/users
async function createUser(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "name, email, password and role are required" });
    }
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hash, role]
    );
    logAudit({ userId: req.user.id, action: "create_user", entityType: "user", metadata: { email, role }, ip: clientIp(req) });
    res.status(201).json({ message: "User created" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "That email is already registered" });
    }
    next(err);
  }
}

// PATCH /api/v1/admin/users/:id
async function updateUser(req, res, next) {
  try {
    const { name, email, role, is_active, password } = req.body;
    const fields = [], vals = [];
    if (name !== undefined)      { fields.push("name = ?");      vals.push(name); }
    if (email !== undefined)     { fields.push("email = ?");     vals.push(email); }
    if (role !== undefined)      { fields.push("role = ?");      vals.push(role); }
    if (is_active !== undefined) { fields.push("is_active = ?"); vals.push(is_active ? 1 : 0); }
    if (password)                { fields.push("password = ?");  vals.push(await bcrypt.hash(password, 10)); }
    if (fields.length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }
    vals.push(req.params.id);
    await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, vals);
    logAudit({ userId: req.user.id, action: "update_user", entityType: "user", entityId: req.params.id, ip: clientIp(req) });
    res.json({ message: "User updated" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "That email is already registered" });
    }
    next(err);
  }
}

// DELETE /api/v1/admin/users/:id
async function deleteUser(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }
    await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    logAudit({ userId: req.user.id, action: "delete_user", entityType: "user", entityId: req.params.id, ip: clientIp(req) });
    res.json({ message: "User deleted" });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ error: "Cannot delete: this user still owns courses or records" });
    }
    next(err);
  }
}

// GET /api/v1/admin/courses
async function listCourses(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.title, c.code, c.credits, c.is_active, c.academic_year,
              d.name AS department, u.name AS lecturer_name,
              COUNT(e.id) AS student_count
         FROM courses c
         LEFT JOIN departments d ON d.id = c.department_id
         LEFT JOIN users u       ON u.id = c.lecturer_id
         LEFT JOIN enrollments e ON e.course_id = c.id
        GROUP BY c.id
        ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/settings
async function getSettings(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT setting_key, setting_value, description FROM system_settings ORDER BY setting_key"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/admin/settings — body: { key: value, ... }
async function updateSettings(req, res, next) {
  try {
    for (const [key, value] of Object.entries(req.body || {})) {
      await pool.query(
        "UPDATE system_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?",
        [String(value), req.user.id, key]
      );
    }
    logAudit({ userId: req.user.id, action: "update_settings", entityType: "system_settings", metadata: req.body || {}, ip: clientIp(req) });
    res.json({ message: "Settings saved" });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/audit — last 100 audit log entries
async function listAudit(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.created_at,
              u.name AS user_name
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id
        ORDER BY a.created_at DESC
        LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  stats, listUsers, createUser, updateUser, deleteUser,
  listCourses, getSettings, updateSettings, listAudit,
};
