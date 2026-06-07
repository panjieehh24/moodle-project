const router = require("express").Router();
const { login, me, updateMe } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

router.post("/login", login);
router.get("/me", authenticate, me);
router.patch("/me", authenticate, updateMe);

module.exports = router;
