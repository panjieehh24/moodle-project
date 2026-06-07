const pool = require("../db/connection");
const { v4: uuidv4 } = require("uuid");
const { logAudit, clientIp } = require("../utils/audit");
const { getDownloadUrl } = require("../utils/blob");

// ---------------------------------------------------------------------------
// Access helper — resolves what the current user may do in a given course.
//   canView   : may read course content (owner lecturer, admin, or an active
//               enrolled student)
//   canManage : may create/modify content (the course's lecturer, or an admin)
// Returns null when the course does not exist.
// ---------------------------------------------------------------------------
async function getCourseAccess(courseId, user) {
  const [[course]] = await pool.query(
    "SELECT id, lecturer_id FROM courses WHERE id = ?",
    [courseId]
  );
  if (!course) return null;

  const canManage = user.role === "admin" || course.lecturer_id === user.id;
  let canView = canManage;
  if (!canView) {
    const [[en]] = await pool.query(
      "SELECT 1 FROM enrollments WHERE course_id = ? AND student_id = ? AND status = 'active'",
      [courseId, user.id]
    );
    canView = !!en;
  }
  return { course, canManage, canView };
}

const STATUSES = ["present", "absent", "excused", "late"];

// ===========================================================================
// PEOPLE
// GET /api/v1/courses/:id/people
// ===========================================================================
async function people(req, res, next) {
  try {
    const access = await getCourseAccess(req.params.id, req.user);
    if (!access) return res.status(404).json({ error: "Course not found" });
    if (!access.canView) return res.status(403).json({ error: "Forbidden" });

    const [[lecturer]] = await pool.query(
      `SELECT u.id, u.name, u.email
         FROM courses c JOIN users u ON u.id = c.lecturer_id
        WHERE c.id = ?`,
      [req.params.id]
    );
    const [students] = await pool.query(
      `SELECT u.id, u.name, u.email, e.status
         FROM enrollments e JOIN users u ON u.id = e.student_id
        WHERE e.course_id = ?
        ORDER BY u.name`,
      [req.params.id]
    );
    res.json({ lecturer, students });
  } catch (err) {
    next(err);
  }
}

// ===========================================================================
// MATERIALS  (course_sections + course_materials)
// ===========================================================================

// GET /api/v1/courses/:id/sections  → sections with nested materials
async function sections(req, res, next) {
  try {
    const access = await getCourseAccess(req.params.id, req.user);
    if (!access) return res.status(404).json({ error: "Course not found" });
    if (!access.canView) return res.status(403).json({ error: "Forbidden" });

    // Students only see visible sections/materials; managers see everything.
    const onlyVisible = access.canManage ? "" : "AND visible = 1";

    const [secs] = await pool.query(
      `SELECT id, title, description, position, visible
         FROM course_sections
        WHERE course_id = ? ${onlyVisible}
        ORDER BY position, created_at`,
      [req.params.id]
    );
    const [mats] = await pool.query(
      `SELECT m.id, m.section_id, m.title, m.type, m.content, m.file_size, m.mime_type, m.position, m.visible
         FROM course_materials m
         JOIN course_sections s ON s.id = m.section_id
        WHERE s.course_id = ? ${onlyVisible ? "AND m.visible = 1" : ""}
        ORDER BY m.position, m.created_at`,
      [req.params.id]
    );

    const bySection = {};
    secs.forEach((s) => { bySection[s.id] = { ...s, materials: [] }; });
    mats.forEach((m) => { if (bySection[m.section_id]) bySection[m.section_id].materials.push(m); });
    res.json(secs.map((s) => bySection[s.id]));
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/courses/:id/sections  (lecturer/admin)
async function createSection(req, res, next) {
  try {
    const access = await getCourseAccess(req.params.id, req.user);
    if (!access) return res.status(404).json({ error: "Course not found" });
    if (!access.canManage) return res.status(403).json({ error: "Forbidden" });

    const { title, description } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: "Section title is required" });

    const [[mx]] = await pool.query(
      "SELECT COALESCE(MAX(position), 0) + 1 AS pos FROM course_sections WHERE course_id = ?",
      [req.params.id]
    );
    const id = uuidv4();
    await pool.query(
      "INSERT INTO course_sections (id, course_id, title, description, position) VALUES (?, ?, ?, ?, ?)",
      [id, req.params.id, title.trim(), description || null, mx.pos]
    );
    logAudit({ userId: req.user.id, action: "create_section", entityType: "course_section", entityId: id, ip: clientIp(req) });
    res.status(201).json({ id, message: "Section created" });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/courses/:id/sections/:sectionId/materials  (lecturer/admin)
// Multipart: fields { title, type, content } + optional file field "file".
async function addMaterial(req, res, next) {
  try {
    const access = await getCourseAccess(req.params.id, req.user);
    if (!access) return res.status(404).json({ error: "Course not found" });
    if (!access.canManage) return res.status(403).json({ error: "Forbidden" });

    // Confirm the section belongs to this course.
    const [[sec]] = await pool.query(
      "SELECT id FROM course_sections WHERE id = ? AND course_id = ?",
      [req.params.sectionId, req.params.id]
    );
    if (!sec) return res.status(404).json({ error: "Section not found" });

    const title = (req.body.title || "").trim();
    if (!title) return res.status(400).json({ error: "Material title is required" });

    let type = req.body.type || "link";
    let content = req.body.content || null;
    let fileSize = null, mimeType = null;

    if (req.file) {
      type = "file";
      content = req.file.blobName;       // Azure Blob object name (see middleware/upload.js)
      fileSize = req.file.size || null;
      mimeType = req.file.mimetype || null;
    } else if (type === "file") {
      return res.status(400).json({ error: "A file is required for file-type materials" });
    } else if (!content) {
      return res.status(400).json({ error: "Content (a URL or text) is required" });
    }

    const [[mx]] = await pool.query(
      "SELECT COALESCE(MAX(position), 0) + 1 AS pos FROM course_materials WHERE section_id = ?",
      [req.params.sectionId]
    );
    const id = uuidv4();
    await pool.query(
      `INSERT INTO course_materials (id, section_id, title, type, content, file_size, mime_type, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.sectionId, title, type, content, fileSize, mimeType, mx.pos]
    );
    logAudit({ userId: req.user.id, action: "add_material", entityType: "course_material", entityId: id, ip: clientIp(req) });
    res.status(201).json({ id, message: "Material added" });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/courses/:id/materials/:materialId/download
// Returns a short-lived SAS URL for a file-type material.
async function materialDownload(req, res, next) {
  try {
    const access = await getCourseAccess(req.params.id, req.user);
    if (!access) return res.status(404).json({ error: "Course not found" });
    if (!access.canView) return res.status(403).json({ error: "Forbidden" });

    const [[mat]] = await pool.query(
      `SELECT m.title, m.type, m.content
         FROM course_materials m
         JOIN course_sections s ON s.id = m.section_id
        WHERE m.id = ? AND s.course_id = ?`,
      [req.params.materialId, req.params.id]
    );
    if (!mat) return res.status(404).json({ error: "Material not found" });
    if (mat.type !== "file") return res.status(400).json({ error: "This material is not a downloadable file" });

    const url = await getDownloadUrl(mat.content, mat.title);
    res.json({ url });
  } catch (err) {
    next(err);
  }
}

// ===========================================================================
// DISCUSSION FORUMS  (discussion_forums + discussion_posts)
// ===========================================================================

// GET /api/v1/courses/:id/forums
async function forums(req, res, next) {
  try {
    const access = await getCourseAccess(req.params.id, req.user);
    if (!access) return res.status(404).json({ error: "Course not found" });
    if (!access.canView) return res.status(403).json({ error: "Forbidden" });

    const [rows] = await pool.query(
      `SELECT f.id, f.title, f.description, f.is_locked, f.created_at,
              COUNT(p.id)     AS post_count,
              MAX(p.created_at) AS last_post_at
         FROM discussion_forums f
         LEFT JOIN discussion_posts p ON p.forum_id = f.id
        WHERE f.course_id = ?
        GROUP BY f.id
        ORDER BY f.created_at`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/courses/:id/forums  (lecturer/admin)
async function createForum(req, res, next) {
  try {
    const access = await getCourseAccess(req.params.id, req.user);
    if (!access) return res.status(404).json({ error: "Course not found" });
    if (!access.canManage) return res.status(403).json({ error: "Forbidden" });

    const { title, description } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: "Forum title is required" });

    const id = uuidv4();
    await pool.query(
      "INSERT INTO discussion_forums (id, course_id, title, description) VALUES (?, ?, ?, ?)",
      [id, req.params.id, title.trim(), description || null]
    );
    logAudit({ userId: req.user.id, action: "create_forum", entityType: "discussion_forum", entityId: id, ip: clientIp(req) });
    res.status(201).json({ id, message: "Forum created" });
  } catch (err) {
    next(err);
  }
}

// Resolve a forum and confirm it belongs to the course in the path.
async function getForum(courseId, forumId) {
  const [[forum]] = await pool.query(
    "SELECT id, is_locked FROM discussion_forums WHERE id = ? AND course_id = ?",
    [forumId, courseId]
  );
  return forum || null;
}

// GET /api/v1/courses/:id/forums/:forumId/posts
async function posts(req, res, next) {
  try {
    const access = await getCourseAccess(req.params.id, req.user);
    if (!access) return res.status(404).json({ error: "Course not found" });
    if (!access.canView) return res.status(403).json({ error: "Forbidden" });

    const forum = await getForum(req.params.id, req.params.forumId);
    if (!forum) return res.status(404).json({ error: "Forum not found" });

    const [rows] = await pool.query(
      `SELECT p.id, p.parent_id, p.subject, p.body, p.is_pinned, p.created_at,
              u.id AS author_id, u.name AS author_name, u.role AS author_role
         FROM discussion_posts p
         JOIN users u ON u.id = p.author_id
        WHERE p.forum_id = ?
        ORDER BY p.is_pinned DESC, p.created_at`,
      [req.params.forumId]
    );
    res.json({ forum, posts: rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/courses/:id/forums/:forumId/posts  (any course member)
async function createPost(req, res, next) {
  try {
    const access = await getCourseAccess(req.params.id, req.user);
    if (!access) return res.status(404).json({ error: "Course not found" });
    if (!access.canView) return res.status(403).json({ error: "Forbidden" });

    const forum = await getForum(req.params.id, req.params.forumId);
    if (!forum) return res.status(404).json({ error: "Forum not found" });
    if (forum.is_locked && !access.canManage) {
      return res.status(403).json({ error: "This forum is locked" });
    }

    const { subject, body, parent_id } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: "Message body is required" });

    if (parent_id) {
      const [[parent]] = await pool.query(
        "SELECT id FROM discussion_posts WHERE id = ? AND forum_id = ?",
        [parent_id, req.params.forumId]
      );
      if (!parent) return res.status(400).json({ error: "Invalid reply target" });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO discussion_posts (id, forum_id, author_id, parent_id, subject, body)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.params.forumId, req.user.id, parent_id || null, subject || null, body.trim()]
    );
    res.status(201).json({ id, message: "Posted" });
  } catch (err) {
    next(err);
  }
}

// ===========================================================================
// ATTENDANCE  (attendance_sessions + attendance_records)
// ===========================================================================

// GET /api/v1/courses/:id/attendance  — role-aware
//   manager → full session/roster matrix for marking
//   student → their own per-session status + summary
async function attendance(req, res, next) {
  try {
    const access = await getCourseAccess(req.params.id, req.user);
    if (!access) return res.status(404).json({ error: "Course not found" });
    if (!access.canView) return res.status(403).json({ error: "Forbidden" });

    if (access.canManage) {
      const [sessions] = await pool.query(
        "SELECT id, title, held_at, duration_min FROM attendance_sessions WHERE course_id = ? ORDER BY held_at",
        [req.params.id]
      );
      const [records] = await pool.query(
        `SELECT r.session_id, r.student_id, r.status
           FROM attendance_records r
           JOIN attendance_sessions s ON s.id = r.session_id
          WHERE s.course_id = ?`,
        [req.params.id]
      );
      const [students] = await pool.query(
        `SELECT u.id, u.name
           FROM enrollments e JOIN users u ON u.id = e.student_id
          WHERE e.course_id = ? AND e.status = 'active'
          ORDER BY u.name`,
        [req.params.id]
      );
      return res.json({ mode: "manage", sessions, students, records });
    }

    // Student view
    const [sessions] = await pool.query(
      `SELECT s.id, s.title, s.held_at, r.status
         FROM attendance_sessions s
         LEFT JOIN attendance_records r ON r.session_id = s.id AND r.student_id = ?
        WHERE s.course_id = ?
        ORDER BY s.held_at`,
      [req.user.id, req.params.id]
    );
    const total = sessions.length;
    const attended = sessions.filter((s) => s.status === "present" || s.status === "late").length;
    const percent = total ? Math.round((attended / total) * 100) : 0;
    res.json({ mode: "mine", sessions, summary: { total, attended, percent } });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/courses/:id/attendance/sessions  (lecturer/admin)
async function createSession(req, res, next) {
  try {
    const access = await getCourseAccess(req.params.id, req.user);
    if (!access) return res.status(404).json({ error: "Course not found" });
    if (!access.canManage) return res.status(403).json({ error: "Forbidden" });

    const { title, held_at, duration_min } = req.body;
    if (!held_at) return res.status(400).json({ error: "Session date/time is required" });

    const id = uuidv4();
    await pool.query(
      "INSERT INTO attendance_sessions (id, course_id, title, held_at, duration_min) VALUES (?, ?, ?, ?, ?)",
      [id, req.params.id, (title && title.trim()) || "Class Session", held_at, Number(duration_min) || 100]
    );
    logAudit({ userId: req.user.id, action: "create_attendance_session", entityType: "attendance_session", entityId: id, ip: clientIp(req) });
    res.status(201).json({ id, message: "Session created" });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/courses/:id/attendance/sessions/:sessionId/records  (lecturer/admin)
// Body: { records: [ { student_id, status }, ... ] }
async function markAttendance(req, res, next) {
  try {
    const access = await getCourseAccess(req.params.id, req.user);
    if (!access) return res.status(404).json({ error: "Course not found" });
    if (!access.canManage) return res.status(403).json({ error: "Forbidden" });

    const [[ses]] = await pool.query(
      "SELECT id FROM attendance_sessions WHERE id = ? AND course_id = ?",
      [req.params.sessionId, req.params.id]
    );
    if (!ses) return res.status(404).json({ error: "Session not found" });

    const records = Array.isArray(req.body.records) ? req.body.records : [];
    if (records.length === 0) return res.status(400).json({ error: "No records provided" });

    for (const r of records) {
      if (!r.student_id || !STATUSES.includes(r.status)) continue;
      await pool.query(
        `INSERT INTO attendance_records (id, session_id, student_id, status)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), recorded_at = CURRENT_TIMESTAMP`,
        [uuidv4(), req.params.sessionId, r.student_id, r.status]
      );
    }
    logAudit({ userId: req.user.id, action: "mark_attendance", entityType: "attendance_session", entityId: req.params.sessionId, ip: clientIp(req) });
    res.json({ message: "Attendance saved" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  people,
  sections, createSection, addMaterial, materialDownload,
  forums, createForum, posts, createPost,
  attendance, createSession, markAttendance,
};
