const router = require("express").Router();
const { list, get, submit } = require("../controllers/quizController");
const { authenticate, requireRole } = require("../middleware/auth");

router.use(authenticate);

router.get("/", list);
router.get("/:id", get);
router.post("/:id/submit", requireRole("student"), submit);

module.exports = router;
