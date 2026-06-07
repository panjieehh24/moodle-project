const router = require("express").Router();
const c = require("../controllers/adminController");
const { authenticate, requireRole } = require("../middleware/auth");

// Every admin route requires an authenticated admin.
router.use(authenticate, requireRole("admin"));

router.get("/stats", c.stats);

router.get("/users", c.listUsers);
router.post("/users", c.createUser);
router.patch("/users/:id", c.updateUser);
router.delete("/users/:id", c.deleteUser);

router.get("/courses", c.listCourses);

router.get("/settings", c.getSettings);
router.patch("/settings", c.updateSettings);

router.get("/audit", c.listAudit);

module.exports = router;
