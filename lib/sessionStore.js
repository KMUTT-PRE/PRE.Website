const session = require("express-session");

const databaseUrl = process.env.DATABASE_URL;

/**
 * Get appropriate session store based on environment
 * - PostgreSQL (production): Uses connect-pg-simple
 * - SQLite/MemoryStore (development): Uses express-session MemoryStore
 */
function getSessionStore() {
  if (databaseUrl) {
    try {
      const PostgresStore = require("connect-pg-simple")(session);
      const { Pool } = require("pg");
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
    } catch (err) {
      console.warn("[SessionStore] connect-pg-simple not available, falling back to MemoryStore:", err.message);
      return new session.MemoryStore();
    }
  } else {
    console.log("[SessionStore] Using MemoryStore (non-persistent)");
    return new session.MemoryStore();
  }
}

module.exports = {
  getSessionStore,
};
