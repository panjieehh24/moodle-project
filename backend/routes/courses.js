const router = require("express").Router();
const { list, get } = require("../controllers/courseController");
const classroom = require("../controllers/classroomController");
const { authenticate, requireRole } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(authenticate);

router.get("/", list);
router.get("/:id", get);

// --- Classroom: people -----------------------------------------------------
router.get("/:id/people", classroom.people);

// --- Classroom: materials --------------------------------------------------
router.get("/:id/sections", classroom.sections);
router.post("/:id/sections", requireRole("lecturer", "admin"), classroom.createSection);
router.post("/:id/sections/:sectionId/materials",
  requireRole("lecturer", "admin"), upload.single("file"), classroom.addMaterial);
router.get("/:id/materials/:materialId/download", classroom.materialDownload);

// --- Classroom: discussion forums ------------------------------------------
router.get("/:id/forums", classroom.forums);
router.post("/:id/forums", requireRole("lecturer", "admin"), classroom.createForum);
router.get("/:id/forums/:forumId/posts", classroom.posts);
router.post("/:id/forums/:forumId/posts", classroom.createPost);

// --- Classroom: attendance -------------------------------------------------
router.get("/:id/attendance", classroom.attendance);
router.post("/:id/attendance/sessions",
  requireRole("lecturer", "admin"), classroom.createSession);
router.post("/:id/attendance/sessions/:sessionId/records",
  requireRole("lecturer", "admin"), classroom.markAttendance);

module.exports = router;
