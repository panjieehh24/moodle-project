// Imports database/init.sql (schema) and database/seed.sql (data) into a
// remote MySQL database (Clever Cloud).  Run from the repo root:
//   node deploy/import-db.js
// Requires the DATABASE_URL environment variable to be set.

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run: . .\\deploy\\secrets.local.ps1");
  process.exit(1);
}

const u = new URL(url);
const base = {
  host: u.hostname,
  port: Number(u.port) || 3306,
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: u.pathname.replace(/^\//, ""),
  multipleStatements: true,
};

// Clever Cloud's DEV database is pre-created; strip statements that would
// try to create or switch databases.
function clean(sql) {
  return sql
    .replace(/CREATE\s+DATABASE[\s\S]*?;/i, "")
    .replace(/USE\s+`?\w+`?\s*;/gi, "");
}

async function connect() {
  const attempts = [
    { label: "plain (no SSL)", cfg: { ...base } },
    { label: "SSL (no cert verify)", cfg: { ...base, ssl: { rejectUnauthorized: false } } },
  ];
  for (const a of attempts) {
    try {
      const conn = await mysql.createConnection(a.cfg);
      console.log(`Connected using: ${a.label}`);
      return { conn, mode: a.label };
    } catch (e) {
      console.log(`  ${a.label} -> failed (${e.code || e.message})`);
    }
  }
  throw new Error("Could not connect with any method.");
}

(async () => {
  const { conn, mode } = await connect();
  const dbDir = path.join(__dirname, "..", "database");

  // Drop any existing tables so this script is safe to re-run.
  const [existing] = await conn.query("SHOW TABLES");
  if (existing.length) {
    console.log(`Dropping ${existing.length} existing table(s)...`);
    const names = existing.map((r) => "`" + Object.values(r)[0] + "`").join(", ");
    await conn.query(
      `SET FOREIGN_KEY_CHECKS=0; DROP TABLE IF EXISTS ${names}; SET FOREIGN_KEY_CHECKS=1;`
    );
  }

  console.log("Importing init.sql (schema)...");
  await conn.query(clean(fs.readFileSync(path.join(dbDir, "init.sql"), "utf8")));

  console.log("Importing seed.sql (data)...");
  const seed = clean(fs.readFileSync(path.join(dbDir, "seed.sql"), "utf8"));
  await conn.query("SET FOREIGN_KEY_CHECKS=0;\n" + seed + "\nSET FOREIGN_KEY_CHECKS=1;");

  const [tables] = await conn.query("SHOW TABLES");
  const [[users]] = await conn.query("SELECT COUNT(*) n FROM users");
  const [[courses]] = await conn.query("SELECT COUNT(*) n FROM courses");
  const [[assignments]] = await conn.query("SELECT COUNT(*) n FROM assignments");

  console.log("\n=== Import complete ===");
  console.log(`Tables:      ${tables.length}`);
  console.log(`users:       ${users.n}`);
  console.log(`courses:     ${courses.n}`);
  console.log(`assignments: ${assignments.n}`);
  console.log(`\nWorking connection mode: ${mode}`);

  await conn.end();
})().catch((e) => {
  console.error("\nIMPORT FAILED:", e.message);
  process.exit(1);
});
