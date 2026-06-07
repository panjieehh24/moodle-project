const pool = require("../db/connection");

// GET /api/v1/courses — all courses the current user is enrolled in (student) or teaches (lecturer)
async function list(req, res, next) {
  try {
    let rows;
    if (req.user.role === "lecturer") {
      [rows] = await pool.query(
        `SELECT c.id, c.title, c.description, c.created_at,
                COUNT(DISTINCT e.student_id) AS student_count
           FROM courses c
           LEFT JOIN enrollments e ON e.course_id = c.id
          WHERE c.lecturer_id = ?
          GROUP BY c.id`,
        [req.user.id]
      );
    } else {
      [rows] = await pool.query(
        `SELECT c.id, c.title, c.description, c.created_at,
                u.name AS lecturer_name
           FROM courses c
           JOIN enrollments e ON e.course_id = c.id
           JOIN users u ON u.id = c.lecturer_id
          WHERE e.student_id = ?`,
        [req.user.id]
      );
    }
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/courses/:id
async function get(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.name AS lecturer_name
         FROM courses c
         JOIN users u ON u.id = c.lecturer_id
        WHERE c.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Course not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get };
