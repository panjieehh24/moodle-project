const pool = require("../db/connection");
const { v4: uuidv4 } = require("uuid");

// GET /api/v1/quizzes — quizzes in the current student's enrolled courses
async function list(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT q.id AS quiz_id, a.id AS assignment_id, a.title, a.due_at,
              c.title AS course_title, q.time_limit_min,
              s.status AS my_status, s.score AS my_score
         FROM enrollments e
         JOIN courses c     ON c.id = e.course_id
         JOIN assignments a ON a.course_id = c.id AND a.type = 'quiz'
         JOIN quizzes q     ON q.assignment_id = a.id
         LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
        WHERE e.student_id = ?
        ORDER BY a.due_at`,
      [req.user.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/quizzes/:id — quiz with questions + options (correct answers hidden)
async function get(req, res, next) {
  try {
    const [[quiz]] = await pool.query(
      `SELECT q.id, q.time_limit_min, a.id AS assignment_id, a.title
         FROM quizzes q JOIN assignments a ON a.id = q.assignment_id
        WHERE q.id = ?`,
      [req.params.id]
    );
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const [questions] = await pool.query(
      "SELECT id, body, type, points, position FROM quiz_questions WHERE quiz_id = ? ORDER BY position",
      [quiz.id]
    );
    for (const q of questions) {
      const [opts] = await pool.query(
        "SELECT id, body, position FROM quiz_options WHERE question_id = ? ORDER BY position",
        [q.id]
      );
      q.options = opts;
    }
    quiz.questions = questions;
    res.json(quiz);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/quizzes/:id/submit — body: { answers: { questionId: optionId } }
async function submit(req, res, next) {
  try {
    const { answers } = req.body;
    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ error: "An answers object is required" });
    }

    const [[quiz]] = await pool.query(
      "SELECT id, assignment_id FROM quizzes WHERE id = ?",
      [req.params.id]
    );
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const [questions] = await pool.query(
      "SELECT id, points FROM quiz_questions WHERE quiz_id = ?",
      [quiz.id]
    );

    // Auto-grade against the correct option of each question
    let totalPoints = 0, earned = 0;
    const grading = [];
    for (const q of questions) {
      totalPoints += Number(q.points);
      const chosen = answers[q.id] || null;
      const [[correct]] = await pool.query(
        "SELECT id FROM quiz_options WHERE question_id = ? AND is_correct = 1 LIMIT 1",
        [q.id]
      );
      const isCorrect = !!(chosen && correct && chosen === correct.id);
      const pts = isCorrect ? Number(q.points) : 0;
      earned += pts;
      grading.push({ questionId: q.id, optionId: chosen, isCorrect, pts });
    }
    const scorePct = totalPoints > 0
      ? Math.round((earned / totalPoints) * 10000) / 100
      : 0;

    // Record the result as a graded submission
    await pool.query(
      `INSERT INTO submissions (assignment_id, student_id, status, score, graded_at)
            VALUES (?, ?, 'graded', ?, UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE status='graded', score=VALUES(score), graded_at=UTC_TIMESTAMP()`,
      [quiz.assignment_id, req.user.id, scorePct]
    );
    const [[sub]] = await pool.query(
      "SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?",
      [quiz.assignment_id, req.user.id]
    );
    const [[last]] = await pool.query(
      "SELECT COALESCE(MAX(attempt_no), 0) AS n FROM quiz_attempts WHERE submission_id = ?",
      [sub.id]
    );

    const attemptId = uuidv4();
    await pool.query(
      `INSERT INTO quiz_attempts (id, submission_id, student_id, quiz_id, attempt_no, score, submitted_at)
            VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
      [attemptId, sub.id, req.user.id, quiz.id, last.n + 1, scorePct]
    );
    for (const g of grading) {
      await pool.query(
        `INSERT INTO quiz_responses (id, attempt_id, question_id, option_id, is_correct, points_earned)
              VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), attemptId, g.questionId, g.optionId, g.isCorrect ? 1 : 0, g.pts]
      );
    }

    res.json({
      score: scorePct,
      correct: grading.filter(g => g.isCorrect).length,
      questions: grading.length,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, submit };
