const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL, // Clever Cloud MySQL connection URI
  ssl: { rejectUnauthorized: false }, // Clever Cloud DEV cert is not chain-verifiable
  waitForConnections: true,
  connectionLimit: 3, // Clever Cloud DEV plan caps concurrent connections
  queueLimit: 0,
  timezone: "+00:00",
  // --- Stability tuning -----------------------------------------------------
  // Keep idle sockets alive so the first request after the container wakes
  // from scale-to-zero does not have to re-establish a cold TCP+TLS handshake.
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  // Bound the time spent waiting on a new connection so a slow DB surfaces a
  // clean error instead of hanging the request indefinitely.
  connectTimeout: 20000,
});

pool.on("error", (err) => {
  console.error("MySQL pool error:", err.code);
});

module.exports = pool;
