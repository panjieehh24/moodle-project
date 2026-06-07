const pool = require("../db/connection");
const path = require("path");
const { getDownloadUrl } = require("../utils/blob");

// GET /api/v1/assignments — upcoming assignments for the current user
async function list(req, res, next) {
  try {
    let rows;
    if (req.user.role === "lecturer") {
      [rows] = await pool.query(
        `SELECT a.*, c.title AS course_title,
                COUNT(s.id) AS submission_count
           FROM assignments a
           JOIN courses c ON c.id = a.course_id
           LEFT JOIN submissions s ON s.assignment_id = a.id
          WHERE c.lecturer_id = ?
          GROUP BY a.id
          ORDER BY a.due_at ASC`,
        [req.user.id]
      );
    } else {
      [rows] = await pool.query(
        `SELECT a.*, c.title AS course_title,
                s.status AS my_status, s.score AS my_grade
           FROM assignments a
           JOIN courses c ON c.id = a.course_id
           JOIN enrollments e ON e.course_id = c.id AND e.student_id = ?
           LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
          ORDER BY a.due_at ASC`,
        [req.user.id, req.user.id]
      );
    }
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/assignments/:id
async function get(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, c.title AS course_title FROM assignments a
         JOIN courses c ON c.id = a.course_id
        WHERE a.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Assignment not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/assignments/:id/submit  (student, multipart/form-data)
async function submit(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // req.file.blobName is set by the custom Azure Blob storage engine
    const filePath = req.file.blobName;
    const assignmentId = req.params.id;
    const studentId = req.user.id;

    // Upsert: one submission per (assignment, student)
    await pool.query(
      `INSERT INTO submissions (assignment_id, student_id, file_path, status)
            VALUES (?, ?, ?, 'submitted')
            ON DUPLICATE KEY UPDATE file_path = VALUES(file_path),
                                    status = 'submitted',
                                    submitted_at = UTC_TIMESTAMP()`,
      [assignmentId, studentId, filePath]
    );

    res.status(201).json({ message: "Submission saved" });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/assignments/:assignmentId/submissions/:studentId/grade  (lecturer)
async function grade(req, res, next) {
  try {
    const { grade: gradeVal, feedback } = req.body;
    if (gradeVal === undefined) return res.status(400).json({ error: "grade is required" });

    await pool.query(
      `UPDATE submissions SET score = ?, feedback = ?, status = 'graded', graded_at = UTC_TIMESTAMP()
        WHERE assignment_id = ? AND student_id = ?`,
      [gradeVal, feedback || null, req.params.assignmentId, req.params.studentId]
    );
    res.json({ message: "Graded" });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/assignments  (lecturer — create an assignment)
async function create(req, res, next) {
  try {
    const { course_id, title, description, type, max_score, due_at } = req.body;
    if (!course_id || !title || !due_at) {
      return res.status(400).json({ error: "course_id, title and due_at are required" });
    }
    await pool.query(
      `INSERT INTO assignments (course_id, title, description, type, max_score, due_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      [course_id, title, description || null, type || "upload",
       max_score || 100, String(due_at).replace("T", " ")]
    );
    res.status(201).json({ message: "Assignment created" });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/assignments/:id/submissions  (lecturer — list submissions to grade)
async function submissions(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.student_id, s.file_path, s.text_response, s.status,
              s.score, s.feedback, s.submitted_at,
              u.name AS student_name, u.email AS student_email
         FROM submissions s
         JOIN users u ON u.id = s.student_id
        WHERE s.assignment_id = ?
        ORDER BY s.submitted_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/assignments/:assignmentId/submissions/:studentId/file
// Short-lived SAS URL for a submitted file. Allowed for the course's lecturer,
// an admin, or the student who owns the submission.
async function submissionFile(req, res, next) {
  try {
    const { assignmentId, studentId } = req.params;
    const [[row]] = await pool.query(
      `SELECT s.file_path, c.lecturer_id, u.name AS student_name
         FROM submissions s
         JOIN assignments a ON a.id = s.assignment_id
         JOIN courses c     ON c.id = a.course_id
         JOIN users u       ON u.id = s.student_id
        WHERE s.assignment_id = ? AND s.student_id = ?`,
      [assignmentId, studentId]
    );
    if (!row) return res.status(404).json({ error: "Submission not found" });

    const allowed =
      req.user.role === "admin" ||
      (req.user.role === "lecturer" && row.lecturer_id === req.user.id) ||
      (req.user.role === "student" && studentId === req.user.id);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    if (!row.file_path) return res.status(404).json({ error: "No file attached to this submission" });

    const url = await getDownloadUrl(row.file_path, `${row.student_name}${path.extname(row.file_path)}`);
    res.json({ url });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, submit, grade, create, submissions, submissionFile };
