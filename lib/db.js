const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const fs = require("fs");

const dbFile = path.join(__dirname, "..", "data", "site.sqlite");
const databaseUrl = process.env.DATABASE_URL;
const dbProvider = (process.env.DB_PROVIDER || "auto").toLowerCase();
const validProviders = new Set(["auto", "postgres", "sqlite"]);

if (!validProviders.has(dbProvider)) {
  throw new Error("DB_PROVIDER must be one of: auto, postgres, sqlite");
}

const forcePostgres = dbProvider === "postgres";
const forceSqlite = dbProvider === "sqlite";
const usePostgres = forceSqlite ? false : forcePostgres || Boolean(databaseUrl);
const postgresSchema = process.env.DATABASE_SCHEMA || "public";
const isProduction = process.env.NODE_ENV === "production";

let dbPromise;

function parseDatabaseUrl() {
  if (!databaseUrl) {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(databaseUrl);
  } catch (err) {
    throw new Error(
      "DATABASE_URL is invalid. Paste the full Render PostgreSQL Internal Database URL, not just the database name.",
    );
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error(
      "DATABASE_URL must start with postgres:// or postgresql://. Paste the full Render PostgreSQL Internal Database URL.",
    );
  }

  if (!parsed.hostname || !parsed.username || !parsed.pathname.slice(1)) {
    throw new Error(
      "DATABASE_URL is missing host, username, or database name. Paste the full Render PostgreSQL Internal Database URL.",
    );
  }

  const isIpv4Host = /^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname);
  const hostnameLooksIncomplete =
    !parsed.hostname.includes(".") &&
    parsed.hostname !== "localhost" &&
    !isIpv4Host;

  if (hostnameLooksIncomplete) {
    console.warn(
      "[Database] DATABASE_URL host has no dot; this may fail on local machines. If connection fails locally, use your provider external/public endpoint.",
    );
  }

  return parsed;
}

function convertPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function qualifyAppTables(sql) {
  const schema = quoteIdentifier(postgresSchema);
  const tableNames = ["news_posts", "news_images", "page_views", "session"];
  let qualifiedSql = sql;

  for (const tableName of tableNames) {
    const tablePattern = new RegExp(`(?<!\\.)\\b${tableName}\\b`, "g");
    qualifiedSql = qualifiedSql.replace(tablePattern, `${schema}.${tableName}`);
  }

  return qualifiedSql;
}

function createPostgresAdapter(pool) {
  return {
    async get(sql, ...params) {
      const result = await pool.query(
        convertPlaceholders(qualifyAppTables(sql)),
        params,
      );
      return result.rows[0];
    },

    async all(sql, ...params) {
      const result = await pool.query(
        convertPlaceholders(qualifyAppTables(sql)),
        params,
      );
      return result.rows;
    },

    async run(sql, ...params) {
      const query = convertPlaceholders(qualifyAppTables(sql));
      const needsReturningId =
        /^INSERT\s+INTO\s+(news_posts|news_images)\b/i.test(sql) &&
        !/\bRETURNING\b/i.test(sql);
      const result = await pool.query(
        needsReturningId ? `${query} RETURNING id` : query,
        params,
      );

      return {
        lastID: result.rows[0]?.id,
        changes: result.rowCount,
      };
    },

    async exec(sql) {
      return pool.query(qualifyAppTables(sql));
    },
  };
}

function quoteIdentifier(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error("DATABASE_SCHEMA must contain only letters, numbers, and underscores");
  }

  return `"${value}"`;
}

async function getDb() {
  if (forcePostgres && !databaseUrl) {
    throw new Error(
      "DB_PROVIDER=postgres requires DATABASE_URL. Refusing to fall back to SQLite.",
    );
  }

  if (isProduction && !usePostgres) {
    throw new Error(
      "DATABASE_URL is required in production. Set Render PostgreSQL Internal Database URL in the web service environment.",
    );
  }

  if (!dbPromise) {
    dbPromise = usePostgres
      ? Promise.resolve().then(() => {
          const parsedDatabaseUrl = parseDatabaseUrl();
          const { Pool } = require("pg");
          const pool = new Pool({
            connectionString: parsedDatabaseUrl.toString(),
            /*
             Using an explicit SET search_path after creating the pool is
             more reliable across environments than relying on the
             libpq "options" property.
            */
            ssl:
              process.env.DATABASE_SSL === "false"
                ? false
                : { rejectUnauthorized: false },
          });

          pool.on("connect", (client) => {
            client
              .query(`SET search_path TO ${quoteIdentifier(postgresSchema)}, public`)
              .catch((err) => {
                console.error("Failed to set postgres search_path:", err);
              });
          });

          // Log and surface pool errors to aid debugging
          pool.on("error", (err) => {
            console.error("Postgres pool error:", err);
          });

          // Ensure the session search_path is set so unqualified table
          // references use the configured schema.
          return pool
            .query(`SET search_path TO ${quoteIdentifier(postgresSchema)}, public`)
            .then(() => createPostgresAdapter(pool));
        })
      : open({
          filename: dbFile,
          driver: sqlite3.Database,
        });
  }

  return dbPromise;
}

function getDbInfo() {
  const parsedDatabaseUrl = parseDatabaseUrl();

  return {
    provider: usePostgres ? "postgres" : "sqlite",
    configuredProvider: dbProvider,
    schema: usePostgres ? postgresSchema : null,
    host: parsedDatabaseUrl?.hostname || null,
    database: parsedDatabaseUrl?.pathname.slice(1) || null,
    username: parsedDatabaseUrl?.username || null,
    filename: usePostgres ? null : dbFile,
  };
}

async function initDb() {
  const db = await getDb();

  if (usePostgres) {
    await db.exec(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(postgresSchema)}`);
    const qualifiedSessionTable = `${quoteIdentifier(postgresSchema)}.session`;
    const qualifiedNewsPostsTable = `${quoteIdentifier(postgresSchema)}.news_posts`;
    const qualifiedPageViewsTable = `${quoteIdentifier(postgresSchema)}.page_views`;
    const qualifiedNewsImagesTable = `${quoteIdentifier(postgresSchema)}.news_images`;

    await db.exec(`
      CREATE TABLE IF NOT EXISTS ${qualifiedSessionTable} (
        sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
        sess JSON NOT NULL,
        expire INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_session_expire
        ON ${qualifiedSessionTable}(expire);

      CREATE TABLE IF NOT EXISTS ${qualifiedNewsPostsTable} (
        id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL DEFAULT 'news',
        category_label TEXT NOT NULL DEFAULT 'ข่าวสาร',
        branches TEXT NOT NULL DEFAULT '',
        published_date TEXT NOT NULL,
        cover_image TEXT NOT NULL DEFAULT '',
        summary TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'published',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ${qualifiedPageViewsTable} (
        id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        path TEXT NOT NULL,
        page_title TEXT NOT NULL DEFAULT '',
        referrer TEXT NOT NULL DEFAULT '',
        user_agent TEXT NOT NULL DEFAULT '',
        ip_hash TEXT NOT NULL DEFAULT '',
        visited_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ${qualifiedNewsImagesTable} (
        id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        news_post_id INTEGER NOT NULL REFERENCES ${qualifiedNewsPostsTable}(id) ON DELETE CASCADE,
        image_path TEXT NOT NULL,
        alt_text TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_news_posts_status_date
        ON ${qualifiedNewsPostsTable}(status, published_date DESC);

      CREATE INDEX IF NOT EXISTS idx_page_views_path_time
        ON ${qualifiedPageViewsTable}(path, visited_at DESC);

      CREATE INDEX IF NOT EXISTS idx_news_images_post
        ON ${qualifiedNewsImagesTable}(news_post_id, sort_order, id);
    `);
    return;
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess JSON NOT NULL,
      expire INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_expire
      ON sessions(expire);

    CREATE TABLE IF NOT EXISTS news_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'news',
      category_label TEXT NOT NULL DEFAULT 'ข่าวสาร',
      branches TEXT NOT NULL DEFAULT '',
      published_date TEXT NOT NULL,
      cover_image TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'published',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      page_title TEXT NOT NULL DEFAULT '',
      referrer TEXT NOT NULL DEFAULT '',
      user_agent TEXT NOT NULL DEFAULT '',
      ip_hash TEXT NOT NULL DEFAULT '',
      visited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS news_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      news_post_id INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      alt_text TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (news_post_id) REFERENCES news_posts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_news_posts_status_date
      ON news_posts(status, published_date DESC);

    CREATE INDEX IF NOT EXISTS idx_page_views_path_time
      ON page_views(path, visited_at DESC);

    CREATE INDEX IF NOT EXISTS idx_news_images_post
      ON news_images(news_post_id, sort_order, id);
  `);

  await db.run("PRAGMA foreign_keys = ON");
}

/**
 * Test database connection and return status information
 * Useful for health checks and debugging
 */
async function testDbConnection() {
  const dbInfo = getDbInfo();
  const result = {
    configured: Boolean(databaseUrl),
    provider: dbInfo.provider,
    configuredProvider: dbInfo.configuredProvider,
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    // Parse DATABASE_URL if PostgreSQL
    if (usePostgres) {
      const parsed = parseDatabaseUrl();
      result.checks.urlParsed = {
        status: "✅ OK",
        host: parsed?.hostname || "unknown",
        database: parsed?.pathname.slice(1) || "unknown",
        username: parsed?.username || "unknown",
      };
    } else {
      result.checks.dbFile = {
        status: "✅ OK",
        path: dbFile,
        exists: fs.existsSync(dbFile),
      };
    }

    // Try to get a connection
    const db = await getDb();
    result.checks.connectionPool = {
      status: "✅ OK",
      message: "Connection pool created successfully",
    };

    // Run a simple query to verify actual connection
    try {
      if (usePostgres) {
        const result_query = await db.get("SELECT NOW() as current_time");
        result.checks.queryTest = {
          status: "✅ OK",
          message: "Query executed successfully",
          serverTime: result_query?.current_time,
        };
      } else {
        const result_query = await db.get("SELECT datetime('now') as current_time");
        result.checks.queryTest = {
          status: "✅ OK",
          message: "Query executed successfully",
          serverTime: result_query?.current_time,
        };
      }
    } catch (queryErr) {
      result.checks.queryTest = {
        status: "❌ FAILED",
        error: queryErr.message,
      };
    }

    // Count tables
    try {
      if (usePostgres) {
        const tablesInfo = await db.all(
          `SELECT table_name FROM information_schema.tables 
           WHERE table_schema = $1`,
          dbInfo.schema,
        );
        result.checks.tables = {
          status: "✅ OK",
          count: tablesInfo.length,
          tables: tablesInfo.map((t) => t.table_name),
        };
      } else {
        const tablesInfo = await db.all(
          `SELECT name FROM sqlite_master WHERE type='table'`,
        );
        result.checks.tables = {
          status: "✅ OK",
          count: tablesInfo.length,
          tables: tablesInfo.map((t) => t.name),
        };
      }
    } catch (tableErr) {
      result.checks.tables = {
        status: "⚠️ WARNING",
        error: tableErr.message,
      };
    }

    result.status = "✅ CONNECTED";
  } catch (err) {
    result.status = "❌ CONNECTION FAILED";
    result.error = {
      message: err.message,
      code: err.code,
      errno: err.errno,
    };

    if (usePostgres) {
      result.troubleshooting = [
        "1. Check if DATABASE_URL is set correctly in Render environment",
        "2. Verify DATABASE_URL starts with postgres:// or postgresql://",
        "3. Check Render PostgreSQL service is running",
        "4. Verify network connectivity to database host",
        `5. Current DATABASE_URL (partial): ${databaseUrl?.substring(0, 50)}...`,
      ];
    } else {
      result.troubleshooting = [
        "1. Check if data directory exists",
        "2. Verify SQLite file permissions",
        `3. Expected file location: ${dbFile}`,
      ];
    }
  }

  return result;
}

module.exports = {
  getDb,
  getDbInfo,
  initDb,
  testDbConnection,
};
