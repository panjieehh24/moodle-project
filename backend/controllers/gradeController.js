const pool = require("../db/connection");

// GET /api/v1/grades — the current student's grades across enrolled courses
async function myGrades(req, res, next) {
  try {
    // Weighted grade components (exams, quizzes, projects, etc.)
    const [components] = await pool.query(
      `SELECT c.id AS course_id, c.title AS course_title, c.code AS course_code,
              gc.name AS component, gc.weight,
              ge.score, ge.max_score
         FROM enrollments e
         JOIN courses c          ON c.id = e.course_id
         JOIN grade_components gc ON gc.course_id = c.id
         LEFT JOIN grade_entries ge ON ge.component_id = gc.id AND ge.student_id = ?
        WHERE e.student_id = ?
        ORDER BY c.title, gc.name`,
      [req.user.id, req.user.id]
    );

    // Individual assignment scores
    const [assignments] = await pool.query(
      `SELECT c.title AS course_title, a.title AS assignment, a.max_score,
              s.score, s.status
         FROM enrollments e
         JOIN courses c     ON c.id = e.course_id
         JOIN assignments a ON a.course_id = c.id
         LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
        WHERE e.student_id = ?
        ORDER BY c.title, a.due_at`,
      [req.user.id, req.user.id]
    );

    res.json({ components, assignments });
  } catch (err) {
    next(err);
  }
}

module.exports = { myGrades };
