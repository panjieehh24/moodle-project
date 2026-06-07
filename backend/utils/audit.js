const pool = require("../db/connection");

// Best-effort client IP extraction. Behind Azure Container Apps the real
// client address arrives in x-forwarded-for; fall back to the socket address.
function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim().slice(0, 45);
  return (req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "").slice(0, 45) || null;
}

// Write a row to audit_logs. This is intentionally fire-and-forget: an audit
// failure must never break the user-facing request, so we swallow errors here.
async function logAudit({ userId = null, action, entityType = null, entityId = null, metadata = null, ip = null }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType, entityId, metadata ? JSON.stringify(metadata) : null, ip]
    );
  } catch (err) {
    console.error("audit log failed:", err.code || err.message);
  }
}

module.exports = { logAudit, clientIp };
