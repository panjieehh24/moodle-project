const router = require("express").Router();
const { list, get, submit, grade, create, submissions, submissionFile } = require("../controllers/assignmentController");
const { authenticate, requireRole } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(authenticate);

router.get("/", list);
router.post("/", requireRole("lecturer"), create);
router.get("/:id", get);
router.get("/:id/submissions", requireRole("lecturer"), submissions);
router.get("/:assignmentId/submissions/:studentId/file", submissionFile);
router.post("/:id/submit", requireRole("student"), upload.single("file"), submit);
router.patch(
  "/:assignmentId/submissions/:studentId/grade",
  requireRole("lecturer"),
  grade
);

module.exports = router;
