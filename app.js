try {
  require("dotenv").config();
} catch (err) {
  if (err?.code !== "MODULE_NOT_FOUND") {
    throw err;
  }
  console.warn("[Config] dotenv not installed; using environment variables from runtime");
}

const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const session = require("express-session");
const { getDb, getDbInfo, initDb, testDbConnection } = require("./lib/db");
const { getSessionStore } = require("./lib/sessionStore");
const {
  CATEGORY_LABELS,
  formatThaiDate,
  hashIp,
  linkifyText,
  normalizeNewsInput,
  todayBangkokDate,
} = require("./lib/news");

const app = express();
const port = process.env.PORT || 3000;
const hasAdminPassword = Boolean(process.env.ADMIN_PASSWORD?.trim());
const pageViewDedupMinutes = 10;

console.log(
  hasAdminPassword
    ? "Admin password source: ADMIN_PASSWORD environment variable"
    : "Admin password source: default fallback admin123",
);

// Check DATABASE_URL configuration
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  console.log(
    `[Database] PostgreSQL configured via DATABASE_URL (first 50 chars): ${databaseUrl.substring(0, 50)}...`,
  );
} else {
  console.log(
    "[Database] Using SQLite (no DATABASE_URL found) - data will be stored locally",
  );
}

fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
fs.mkdirSync(path.join(__dirname, "public", "uploads", "news"), {
  recursive: true,
});

app.set("view engine", "ejs");
app.set("trust proxy", true);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// Configure persistent session store
const sessionStore = getSessionStore();

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "change-this-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "public", "uploads", "news"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
});

const newsUpload = upload.fields([
  { name: "cover_image", maxCount: 1 },
  { name: "gallery_images", maxCount: 30 },
]);

async function saveGalleryImages(db, postId, files) {
  const galleryFiles = files?.gallery_images || [];

  for (let index = 0; index < galleryFiles.length; index += 1) {
    await db.run(
      `INSERT INTO news_images (news_post_id, image_path, sort_order)
       VALUES (?, ?, ?)`,
      postId,
      `/uploads/news/${galleryFiles[index].filename}`,
      index,
    );
  }
}

async function getPostImages(db, postId) {
  return db.all(
    `SELECT * FROM news_images
     WHERE news_post_id = ?
     ORDER BY sort_order, id`,
    postId,
  );
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }

  return res.redirect("/admin/login");
}

function legacyNewsFiles(limit) {
  const newsDir = path.join(__dirname, "views", "news", "2569");

  try {
    if (!fs.existsSync(newsDir)) {
      return [];
    }

    const files = fs
      .readdirSync(newsDir)
      .filter((file) => file.endsWith(".ejs"))
      .map((file) => file.replace(".ejs", ""))
      .sort()
      .reverse();

    return limit ? files.slice(0, limit) : files;
  } catch (err) {
    console.error("Error reading legacy news:", err);
    return [];
  }
}

const PAGE_LABELS = {
  "/": "หน้าแรก",
  "/pre": "หลักสูตร PRE",
  "/mce": "หลักสูตร MCE",
  "/isee": "หลักสูตร ISEE",
  "/m_eng": "หลักสูตร M.Eng",
  "/ph_d": "หลักสูตร Ph.D",
  "/TABEE": "TABEE",
  "/history_dep": "ประวัติภาควิชา",
  "/instrument": "ห้อง Lab อุปกรณ์",
  "/myteam": "บุคลากร",
  "/myteam2": "บุคลากร",
  "/document": "เอกสาร",
  "/cdp": "โครงงานวิศวกรรม",
  "/scholarship": "ทุนการศึกษา",
  "/research": "งานวิจัยและบริการวิชาการ",
  "/news": "ข่าวสาร",
};

function stripQuery(value) {
  return (value || "").split("?")[0];
}

async function pageLabel(db, rawPath) {
  const cleanPath = stripQuery(rawPath);

  if (cleanPath === "__other__") {
    return "อื่นๆ";
  }

  if (PAGE_LABELS[cleanPath]) {
    return PAGE_LABELS[cleanPath];
  }

  if (cleanPath.startsWith("/news/")) {
    const slug = cleanPath.replace("/news/", "");
    const post = await db.get(
      "SELECT title FROM news_posts WHERE slug = ?",
      slug,
    );

    return post ? `ข่าว: ${post.title}` : `ข่าว: ${slug}`;
  }

  if (cleanPath.startsWith("/personel/")) {
    return `บุคลากร: ${cleanPath.replace("/personel/", "")}`;
  }

  return cleanPath;
}

async function withPageLabels(db, rows) {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      page_label: await pageLabel(db, row.path),
      visited_at_display: row.visited_at
        ? formatBangkokDateTime(row.visited_at)
        : row.visited_at,
    })),
  );
}

function currentPeriodBounds() {
  const bangkokParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  })
    .formatToParts(new Date())
    .reduce((parts, part) => {
      parts[part.type] = part.value;
      return parts;
    }, {});
  const year = Number(bangkokParts.year);
  const month = Number(bangkokParts.month);
  const monthStart = new Date(Date.UTC(year, month - 1, 1) - 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  const yearStart = new Date(Date.UTC(year, 0, 1) - 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  return { monthStart, yearStart };
}

function formatBangkokDateTime(value) {
  if (!value) {
    return "";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(`${String(value).replace(" ", "T")}Z`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", "");
}

async function trackPageView(req, res, next) {
  if (req.method !== "GET" || req.path.startsWith("/admin")) {
    return next();
  }

  res.on("finish", async () => {
    if (res.statusCode >= 400 || req.path.includes(".")) {
      return;
    }

    try {
      const userAgent = req.get("user-agent") || "";
      const isBot = /bot|crawler|spider|preview|monitor|healthcheck|uptime|pingdom|headless|lighthouse/i.test(
        userAgent,
      );

      if (isBot) {
        return;
      }

      const db = await getDb();
      const pathOnly = req.path;
      const ipHash = hashIp(req.ip);
      const duplicateCutoff = new Date(
        Date.now() - pageViewDedupMinutes * 60 * 1000,
      )
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
      const duplicate = await db.get(
        `SELECT id
         FROM page_views
         WHERE path = ?
           AND ip_hash = ?
           AND user_agent = ?
           AND visited_at >= ?
         LIMIT 1`,
        pathOnly,
        ipHash,
        userAgent,
        duplicateCutoff,
      );

      if (duplicate) {
        return;
      }

      await db.run(
        `INSERT INTO page_views
          (path, page_title, referrer, user_agent, ip_hash)
         VALUES (?, ?, ?, ?, ?)`,
        pathOnly,
        res.locals.pageTitle || "",
        req.get("referer") || "",
        userAgent,
        ipHash,
      );
    } catch (err) {
      console.error("Page view tracking error:", err);
    }
  });

  return next();
}

app.use(trackPageView);

app.use(async (req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/admin")) {
    return next();
  }

  try {
    const db = await getDb();
    const { monthStart, yearStart } = currentPeriodBounds();
    const [monthViews, yearViews] = await Promise.all([
      db.get(
        "SELECT COUNT(*) AS count FROM page_views WHERE visited_at >= ?",
        monthStart,
      ),
      db.get(
        "SELECT COUNT(*) AS count FROM page_views WHERE visited_at >= ?",
        yearStart,
      ),
    ]);

    res.locals.analyticsSummary = {
      monthViews: monthViews.count,
      yearViews: yearViews.count,
    };
  } catch (err) {
    console.error("Footer analytics error:", err);
    res.locals.analyticsSummary = {
      monthViews: 0,
      yearViews: 0,
    };
  }

  return next();
});

/**
 * Database Backup & Recovery Functions
 * Ensures data persistence and recovery
 */

async function createDataBackup(db) {
  try {
    const timestamp = formatBangkokDateTime(new Date());
    const backupName = `backup-${Date.now()}.json`;
    const backupPath = path.join(__dirname, "data", "backups");

    fs.mkdirSync(backupPath, { recursive: true });

    const [posts, pageViews] = await Promise.all([
      db.all("SELECT * FROM news_posts ORDER BY created_at DESC"),
      db.all("SELECT COUNT(*) as total FROM page_views"),
    ]);

    const backup = {
      timestamp,
      backupName,
      metadata: {
        postsCount: posts.length,
        pageViewsTotal: pageViews[0]?.total || 0,
      },
      posts,
    };

    fs.writeFileSync(
      path.join(backupPath, backupName),
      JSON.stringify(backup, null, 2),
    );

    // Keep only last 10 backups
    const backupFiles = fs
      .readdirSync(backupPath)
      .filter((f) => f.startsWith("backup-"))
      .sort()
      .reverse();

    if (backupFiles.length > 10) {
      backupFiles.slice(10).forEach((file) => {
        fs.unlinkSync(path.join(backupPath, file));
      });
    }

    console.log(`✅ Data backup created: ${backupName}`);
    return backup;
  } catch (err) {
    console.error("❌ Backup error:", err);
    throw err;
  }
}

async function checkDatabaseIntegrity(db) {
  try {
    const [postsInfo, viewsInfo, imagesInfo] = await Promise.all([
      db.get("SELECT COUNT(*) as total FROM news_posts"),
      db.get("SELECT COUNT(*) as total FROM page_views"),
      db.get("SELECT COUNT(*) as total FROM news_images"),
    ]);

    const integrity = {
      status: "ok",
      tables: {
        news_posts: postsInfo?.total || 0,
        page_views: viewsInfo?.total || 0,
        news_images: imagesInfo?.total || 0,
      },
      timestamp: formatBangkokDateTime(new Date()),
    };

    // Alert if data drops suddenly
    if (integrity.tables.news_posts === 0 && integrity.tables.page_views === 0) {
      integrity.status = "warning";
      integrity.message = "⚠️ All data tables are empty";
    }

    console.log(`📊 Database integrity check: ${JSON.stringify(integrity)}`);
    return integrity;
  } catch (err) {
    console.error("❌ Integrity check error:", err);
    return {
      status: "error",
      message: err.message,
    };
  }
}

async function getDataRecoveryInfo(db) {
  try {
    const backupPath = path.join(__dirname, "data", "backups");

    if (!fs.existsSync(backupPath)) {
      return { backups: [], latestBackup: null };
    }

    const backupFiles = fs
      .readdirSync(backupPath)
      .filter((f) => f.startsWith("backup-"))
      .map((filename) => {
        const filepath = path.join(backupPath, filename);
        const stat = fs.statSync(filepath);

        return {
          filename,
          size: stat.size,
          created: formatBangkokDateTime(stat.mtime),
          path: filepath,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.created).getTime() - new Date(a.created).getTime(),
      );

    return {
      backups: backupFiles,
      latestBackup: backupFiles[0] || null,
    };
  } catch (err) {
    console.error("❌ Recovery info error:", err);
    return { backups: [], latestBackup: null, error: err.message };
  }
}

// Perform initial backup on startup
async function performStartupBackup() {
  try {
    const db = await getDb();
    const integrity = await checkDatabaseIntegrity(db);

    if (integrity.tables.news_posts > 0 || integrity.tables.page_views > 0) {
      await createDataBackup(db);
    }
  } catch (err) {
    console.error("Startup backup error:", err);
  }
}

app.get("/", async (req, res) => {
  res.locals.pageTitle = "Homepage";
  const db = await getDb();
  const latestDbNews = await db.all(
    `SELECT * FROM news_posts
     WHERE status = 'published'
     ORDER BY published_date DESC, id DESC
     LIMIT 8`,
  );

  res.render("pages/Homepage", {
    latestDbNews,
    formatThaiDate,
  });
});

app.get("/pre", (req, res) => res.render("pages/PRE"));
app.get("/mce", (req, res) => res.render("pages/MCE"));
app.get("/isee", (req, res) => res.render("pages/ISEE"));
app.get("/m_eng", (req, res) => res.render("pages/M_Eng"));
app.get("/ph_d", (req, res) => res.render("pages/Ph_D"));
app.get("/TABEE", (req, res) => res.render("pages/TABEE"));
app.get("/history_dep", (req, res) => res.render("pages/history_dep"));
app.get("/instrument", (req, res) => res.render("pages/instrument"));
app.get("/myteam", (req, res) => res.render("pages/myteam"));
app.get("/document", (req, res) => res.render("pages/document"));
app.get("/cdp", (req, res) => res.render("pages/cdp"));
app.get("/scholarship", (req, res) => res.render("pages/scholarship"));

app.get("/news", async (req, res) => {
  res.locals.pageTitle = "News";
  const db = await getDb();
  const dbNews = await db.all(
    `SELECT * FROM news_posts
     WHERE status = 'published'
     ORDER BY published_date DESC, id DESC`,
  );
  const newsFiles = legacyNewsFiles();

  res.render("pages/news", {
    newsFiles,
    dbNews,
    carouselNews: newsFiles.slice(0, 5),
    formatThaiDate,
  });
});

app.get("/news/:postID", async (req, res) => {
  const postID = req.params.postID;
  const db = await getDb();
  const post = await db.get(
    `SELECT * FROM news_posts WHERE slug = ? AND status = 'published'`,
    postID,
  );

  if (post) {
    res.locals.pageTitle = post.title;
    const images = await getPostImages(db, post.id);
    return res.render("pages/news-detail", {
      post,
      images,
      formatThaiDate,
      linkifyText,
    });
  }

  const viewPath = `news/2569/news/${postID}`;
  return res.render(viewPath, (err, html) => {
    if (err) {
      console.error("News view not found:", viewPath);
      res.status(404).send("404 Not Found");
    } else {
      res.send(html);
    }
  });
});

app.get("/admin/login", (req, res) => {
  res.render("admin/login", { error: "" });
});

app.post("/admin/login", (req, res) => {
  const password = process.env.ADMIN_PASSWORD?.trim() || "admin123";

  if (req.body.password?.trim() === password) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }

  return res.status(401).render("admin/login", {
    error: "รหัสผ่านไม่ถูกต้อง",
  });
});

app.post("/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

app.get("/admin", requireAdmin, async (req, res) => {
  const db = await getDb();
  const [totalViews, totalNews, topPagesRaw, chartPagesRaw, recentViewsRaw] = await Promise.all([
    db.get("SELECT COUNT(*) AS count FROM page_views"),
    db.get("SELECT COUNT(*) AS count FROM news_posts"),
    db.all(
      `SELECT path, COUNT(*) AS views
       FROM page_views
       GROUP BY path
       ORDER BY views DESC
       LIMIT 10`,
    ),
    db.all(
      `SELECT path, COUNT(*) AS views
       FROM page_views
       GROUP BY path
       ORDER BY views DESC`,
    ),
    db.all(
      `SELECT path, visited_at
       FROM page_views
       ORDER BY visited_at DESC
       LIMIT 20`,
    ),
  ]);
  const [topPages, recentViews] = await Promise.all([
    withPageLabels(db, topPagesRaw),
    withPageLabels(db, recentViewsRaw),
  ]);
  const chartPagesWithoutHome = chartPagesRaw.filter((row) => row.path !== "/");
  const chartTopRows = chartPagesWithoutHome.slice(0, 8);
  const otherViews = chartPagesWithoutHome
    .slice(8)
    .reduce((sum, row) => sum + Number(row.views || 0), 0);
  const chartRowsRaw = otherViews
    ? [...chartTopRows, { path: "__other__", views: otherViews }]
    : chartTopRows;
  const chartRows = await withPageLabels(db, chartRowsRaw);
  const maxChartViews = Math.max(
    1,
    ...chartRows.map((row) => Number(row.views || 0)),
  );

  res.render("admin/dashboard", {
    totalViews: totalViews.count,
    totalNews: totalNews.count,
    topPages,
    chartRows,
    maxChartViews,
    recentViews,
  });
});

/**
 * Database Health Check Endpoint
 * Returns detailed connection status and database information
 */
app.get("/api/health", async (req, res) => {
  const healthStatus = await testDbConnection();
  const statusCode = healthStatus.status.includes("✅") ? 200 : 503;

  res.status(statusCode).json(healthStatus);
});

/**
 * Admin Database Health Check Page
 * Detailed health information for administrators
 */
app.get("/admin/db-health-check", requireAdmin, async (req, res) => {
  const healthStatus = await testDbConnection();

  res.render("admin/db-health-check", {
    pageTitle: "Database Health Check",
    healthStatus,
    timestamp: new Date().toISOString(),
  });
});

app.get("/admin/db-status", requireAdmin, async (req, res) => {
  const db = await getDb();
  const dbInfo = getDbInfo();
  const [totalNews, publishedNews, totalImages, latestPosts] = await Promise.all([
    db.get("SELECT COUNT(*) AS count FROM news_posts"),
    db.get("SELECT COUNT(*) AS count FROM news_posts WHERE status = 'published'"),
    db.get("SELECT COUNT(*) AS count FROM news_images"),
    db.all(
      `SELECT id, title, slug, status, published_date, created_at, updated_at
       FROM news_posts
       ORDER BY published_date DESC, id DESC
       LIMIT 10`,
    ),
  ]);

  const dbDebug = {
    currentSchema: null,
    searchPath: null,
    tableSchemas: [],
  };

  if (dbInfo.provider === "postgres") {
    const schemaInfo = await db.get(
      `SELECT current_schema() AS current_schema, current_setting('search_path') AS search_path`,
    );
    const tableSchemas = await db.all(
      `SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_name IN ('news_posts', 'news_images')
       ORDER BY table_schema, table_name`,
    );

    dbDebug.currentSchema = schemaInfo?.current_schema || null;
    dbDebug.searchPath = schemaInfo?.search_path || null;
    dbDebug.tableSchemas = tableSchemas || [];
  }

  res.render("admin/db-status", {
    dbInfo,
    totalNews: totalNews.count,
    publishedNews: publishedNews.count,
    totalImages: totalImages.count,
    latestPosts,
    formatThaiDate,
    dbDebug,
  });
});

app.get("/admin/backup", requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const integrity = await checkDatabaseIntegrity(db);
    const recovery = await getDataRecoveryInfo(db);

    res.render("admin/backup", {
      integrity,
      recovery,
      formatThaiDate,
    });
  } catch (err) {
    console.error("Backup page error:", err);
    res.status(500).render("admin/backup", {
      error: err.message,
      integrity: { status: "error" },
      recovery: { backups: [] },
    });
  }
});

app.post("/admin/backup/create", requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const backup = await createDataBackup(db);

    res.json({
      success: true,
      message: "✅ Backup created successfully",
      backup,
    });
  } catch (err) {
    console.error("Backup creation error:", err);
    res.status(500).json({
      success: false,
      message: "❌ Failed to create backup",
      error: err.message,
    });
  }
});

app.get("/admin/backup/integrity-check", requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const integrity = await checkDatabaseIntegrity(db);

    res.json({
      success: true,
      integrity,
    });
  } catch (err) {
    console.error("Integrity check error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.get("/admin/backup/download/:filename", requireAdmin, async (req, res) => {
  try {
    const { filename } = req.params;

    // Validate filename to prevent directory traversal
    if (!/^backup-\d+\.json$/.test(filename)) {
      return res.status(400).send("Invalid backup filename");
    }

    const backupPath = path.join(__dirname, "data", "backups", filename);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).send("Backup not found");
    }

    res.download(backupPath);
  } catch (err) {
    console.error("Backup download error:", err);
    res.status(500).send("Error downloading backup");
  }
});

app.post("/admin/backup/delete/:filename", requireAdmin, async (req, res) => {
  try {
    const { filename } = req.params;

    // Validate filename to prevent directory traversal
    if (!/^backup-\d+\.json$/.test(filename)) {
      return res.status(400).json({
        success: false,
        message: "Invalid backup filename",
      });
    }

    const backupPath = path.join(__dirname, "data", "backups", filename);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        message: "Backup not found",
      });
    }

    fs.unlinkSync(backupPath);

    res.json({
      success: true,
      message: "✅ Backup deleted successfully",
    });
  } catch (err) {
    console.error("Backup delete error:", err);
    res.status(500).json({
      success: false,
      message: "❌ Failed to delete backup",
      error: err.message,
    });
  }
});

app.get("/admin/news", requireAdmin, async (req, res) => {
  const db = await getDb();
  const posts = await db.all(
    `SELECT * FROM news_posts ORDER BY published_date DESC, id DESC`,
  );

  res.render("admin/news-list", { posts, formatThaiDate });
});

app.get("/admin/news/export", requireAdmin, async (req, res) => {
  const db = await getDb();
  const [posts, images] = await Promise.all([
    db.all(`SELECT * FROM news_posts ORDER BY published_date DESC, id DESC`),
    db.all(`SELECT * FROM news_images ORDER BY news_post_id, sort_order, id`),
  ]);
  const exportedAt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(/[,: ]/g, "-");

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="pre-website-news-backup-${exportedAt}.json"`,
  );
  res.send(
    JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        database: getDbInfo(),
        counts: {
          news_posts: posts.length,
          news_images: images.length,
        },
        news_posts: posts,
        news_images: images,
      },
      null,
      2,
    ),
  );
});

app.get("/admin/news/new", requireAdmin, (req, res) => {
  res.render("admin/news-form", {
    post: null,
    images: [],
    categories: CATEGORY_LABELS,
    defaultDate: todayBangkokDate(),
    action: "/admin/news",
  });
});

app.post("/admin/news", requireAdmin, newsUpload, async (req, res) => {
  try {
    console.log("[News] Admin news create attempt", { title: req.body?.title, slug: req.body?.slug });
    const db = await getDb();
    const dbInfo = getDbInfo();
    console.log("[News] Saving to database:", dbInfo);
    const post = normalizeNewsInput(req.body, req.files?.cover_image?.[0]);

    const result = await db.run(
      `INSERT INTO news_posts
      (title, slug, category, category_label, branches, published_date,
       cover_image, summary, content, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      post.title,
      post.slug,
      post.category,
      post.category_label,
      post.branches,
      post.published_date,
      post.cover_image,
      post.summary,
      post.content,
      post.status,
    );
    await saveGalleryImages(db, result.lastID, req.files);

    return res.redirect("/admin/news");
  } catch (err) {
    try {
      const dbInfo = getDbInfo();
      console.error("Admin news create error:", err && err.stack ? err.stack : err, {
        dbInfo,
        title: req.body?.title,
        slug: req.body?.slug,
      });
    } catch (logErr) {
      console.error("Admin news create error (failed to get dbInfo):", err, logErr);
    }

    return res.status(500).send("Internal Server Error");
  }
});

app.get("/admin/news/:id/edit", requireAdmin, async (req, res) => {
  const db = await getDb();
  const post = await db.get("SELECT * FROM news_posts WHERE id = ?", req.params.id);

  if (!post) {
    return res.status(404).send("News not found");
  }
  const images = await getPostImages(db, post.id);

  return res.render("admin/news-form", {
    post,
    images,
    categories: CATEGORY_LABELS,
    defaultDate: todayBangkokDate(),
    action: `/admin/news/${post.id}`,
  });
});

app.post(
  "/admin/news/:id",
  requireAdmin,
  newsUpload,
  async (req, res) => {
    const db = await getDb();
    const post = normalizeNewsInput(req.body, req.files?.cover_image?.[0]);

    await db.run(
      `UPDATE news_posts
       SET title = ?, slug = ?, category = ?, category_label = ?, branches = ?,
           published_date = ?, cover_image = ?, summary = ?, content = ?,
           status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      post.title,
      post.slug,
      post.category,
      post.category_label,
      post.branches,
      post.published_date,
      post.cover_image,
      post.summary,
      post.content,
      post.status,
      req.params.id,
    );
    await saveGalleryImages(db, req.params.id, req.files);

    res.redirect("/admin/news");
  },
);

app.post("/admin/news-image/:id/delete", requireAdmin, async (req, res) => {
  const db = await getDb();
  const image = await db.get("SELECT * FROM news_images WHERE id = ?", req.params.id);

  if (image) {
    await db.run("DELETE FROM news_images WHERE id = ?", req.params.id);
    return res.redirect(`/admin/news/${image.news_post_id}/edit`);
  }

  return res.redirect("/admin/news");
});

app.post("/admin/news/:id/delete", requireAdmin, async (req, res) => {
  const db = await getDb();
  await db.run("DELETE FROM news_posts WHERE id = ?", req.params.id);
  res.redirect("/admin/news");
});

app.get("/myteam2", (req, res) => res.render("pages/myteam2"));
app.get("/research", (req, res) => res.render("pages/research"));
app.get("/personel/:name", (req, res) => {
  res.render(`pages/personel/${req.params.name}`);
});

const searchContent = () => [
  { title: "หน้าแรก", url: "/", category: "หน้า" },
  { title: "หลักสูตร PRE", url: "/pre", category: "หลักสูตร" },
  { title: "หลักสูตร MCE", url: "/mce", category: "หลักสูตร" },
  { title: "หลักสูตร ISEE", url: "/isee", category: "หลักสูตร" },
  { title: "หลักสูตร M.Eng", url: "/m_eng", category: "หลักสูตร" },
  { title: "หลักสูตร Ph.D", url: "/ph_d", category: "หลักสูตร" },
  { title: "หลักสูตร TABEE", url: "/TABEE", category: "หลักสูตร" },
  { title: "ประวัติภาควิชา", url: "/history_dep", category: "โปรไฟล์" },
  { title: "บุคลากร", url: "/myteam", category: "โปรไฟล์" },
  { title: "ห้อง Lab อุปกรณ์", url: "/instrument", category: "โปรไฟล์" },
  { title: "งานวิจัย", url: "/research", category: "โปรไฟล์" },
  { title: "เอกสาร", url: "/document", category: "นักศึกษา" },
  { title: "ข่าวสาร", url: "/news", category: "ข่าว" },
  { title: "ทุนการศึกษา", url: "/scholarship", category: "นักศึกษา" },
  { title: "CDP", url: "/cdp", category: "นักศึกษา" },
];

app.get("/search", (req, res) => {
  const query = req.query.q || "";

  if (!query || query.length < 2) {
    return res.json([]);
  }

  const lowerQuery = query.toLowerCase();
  const results = searchContent()
    .filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.category.toLowerCase().includes(lowerQuery),
    )
    .slice(0, 10);

  return res.json(results);
});

initDb()
  .then(async () => {
    const dbInfo = getDbInfo();

    app.listen(port, async () => {
      console.log(`App listening at port ${port}`);
      console.log(
        dbInfo.provider === "postgres"
          ? `Database provider: PostgreSQL schema=${dbInfo.schema}`
          : `Database provider: SQLite file=${dbInfo.filename}`,
      );
      console.log("Admin: http://localhost:3000/admin");

      // Test database connection on startup
      console.log("\n🔍 Testing database connection...");
      try {
        const healthStatus = await testDbConnection();
        console.log(`✅ Connection Status: ${healthStatus.status}`);

        if (healthStatus.provider === "postgres") {
          console.log(
            `   Host: ${healthStatus.checks.urlParsed?.host || "unknown"}`,
          );
          console.log(
            `   Database: ${healthStatus.checks.urlParsed?.database || "unknown"}`,
          );
        }

        if (healthStatus.checks.tables) {
          console.log(`   Tables: ${healthStatus.checks.tables.count} found`);
        }

        if (healthStatus.error) {
          console.error(`❌ Error: ${healthStatus.error.message}`);
          if (healthStatus.troubleshooting) {
            console.log("\n🔧 Troubleshooting suggestions:");
            healthStatus.troubleshooting.forEach((step) => console.log(`   ${step}`));
          }
        }
      } catch (err) {
        console.error("❌ Connection test error:", err);
      }

      console.log("");

      // Perform startup backup and integrity check
      try {
        await performStartupBackup();
        const db = await getDb();
        const integrity = await checkDatabaseIntegrity(db);
        console.log(`📊 Database integrity on startup: ${JSON.stringify(integrity)}`);
      } catch (err) {
        console.error("⚠️ Startup backup/integrity check error:", err);
      }
    });
  })
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });
