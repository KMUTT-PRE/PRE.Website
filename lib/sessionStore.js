const session = require("express-session");
const PostgresStore = require("connect-pg-simple")(session);
const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;

/**
 * Get appropriate session store based on environment
 * - PostgreSQL (production): Uses connect-pg-simple
 * - SQLite/MemoryStore (development): Uses express-session MemoryStore
 */
function getSessionStore() {
  if (databaseUrl) {
    console.log("[SessionStore] Using PostgreSQL via connect-pg-simple");
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl:
        process.env.DATABASE_SSL === "false"
          ? false
          : { rejectUnauthorized: false },
    });

    return new PostgresStore({
      pool,
      schemaName: "public",
      tableName: "session",
      disableTouch: false,
    });
  } else {
    console.log("[SessionStore] Using MemoryStore (non-persistent)");
    return new session.MemoryStore();
  }
}

module.exports = {
  getSessionStore,
};
