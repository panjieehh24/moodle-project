const router = require("express").Router();
const { list, unreadCount, create, markRead } = require("../controllers/notificationController");
const { authenticate, requireRole } = require("../middleware/auth");

router.use(authenticate);

router.get("/", list);
router.get("/unread-count", unreadCount);
router.post("/", requireRole("lecturer"), create);
router.patch("/:id/read", markRead);

module.exports = router;
