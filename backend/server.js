require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db/connection");
const errorHandler = require("./middleware/errorHandler");

const app = express();

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL, // e.g. https://moodle-web-frontend.azurestaticapps.net
  "http://localhost:80",    // local dev
  "http://localhost:3000",
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) =>
    (!origin || ALLOWED_ORIGINS.includes(origin))
      ? cb(null, true)
      : cb(new Error("CORS: origin not allowed")),
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/v1/auth",          require("./routes/auth"));
app.use("/api/v1/courses",       require("./routes/courses"));
app.use("/api/v1/assignments",   require("./routes/assignments"));
app.use("/api/v1/notifications", require("./routes/notifications"));
app.use("/api/v1/admin",         require("./routes/admin"));
app.use("/api/v1/grades",        require("./routes/grades"));
app.use("/api/v1/quizzes",       require("./routes/quizzes"));

// Health check / warm-up. Touching the DB here forces the connection pool to
// open a real connection, so the frontend can "pre-warm" a cold container
// (scale-to-zero) before the user submits the login form — cutting the
// perceived first-request latency.
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "up" });
  } catch (err) {
    res.status(503).json({ status: "degraded", db: "down" });
  }
});

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
