const router = require("express").Router();
const { myGrades } = require("../controllers/gradeController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.get("/", myGrades);

module.exports = router;
