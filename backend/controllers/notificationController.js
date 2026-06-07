const pool = require("../db/connection");

// GET /api/v1/notifications — all notifications for current user
async function list(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT n.id, n.type, n.title, n.body, n.is_read, n.created_at,
              a.title AS announcement_title
         FROM notifications n
         LEFT JOIN announcements a ON a.id = n.announcement_id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/notifications/unread-count
async function unreadCount(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS count
         FROM notifications
        WHERE user_id = ? AND is_read = 0`,
      [req.user.id]
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/notifications  (lecturer only — creates announcement + notifies enrolled students)
async function create(req, res, next) {
  try {
    const { course_id, title, body } = req.body;
    if (!course_id || !title || !body) {
      return res.status(400).json({ error: "course_id, title, and body are required" });
    }

    // Insert announcement
    const [annResult] = await pool.query(
      "INSERT INTO announcements (course_id, author_id, title, body) VALUES (?, ?, ?, ?)",
      [course_id, req.user.id, title, body]
    );
    const announcementId = annResult.insertId;

    // Notify all enrolled students
    const [students] = await pool.query(
      "SELECT student_id FROM enrollments WHERE course_id = ? AND status = 'active'",
      [course_id]
    );

    if (students.length > 0) {
      const values = students.map(s => [s.student_id, announcementId, "announcement", title, body]);
      await pool.query(
        "INSERT INTO notifications (user_id, announcement_id, type, title, body) VALUES ?",
        [values]
      );
    }

    res.status(201).json({ message: "Notification posted" });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/notifications/:id/read
async function markRead(req, res, next) {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Marked as read" });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, unreadCount, create, markRead };
