const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const session = require("express-session");
const { getDb, initDb } = require("./lib/db");
const {
  CATEGORY_LABELS,
  formatThaiDate,
  hashIp,
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
fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
fs.mkdirSync(path.join(__dirname, "public", "uploads", "news"), {
  recursive: true,
});

app.set("view engine", "ejs");
app.set("trust proxy", true);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-session-secret",
    resave: false,
    saveUninitialized: false,
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

  const date = new Date(`${value.replace(" ", "T")}Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
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
      const duplicate = await db.get(
        `SELECT id
         FROM page_views
         WHERE path = ?
           AND ip_hash = ?
           AND user_agent = ?
           AND visited_at >= datetime('now', ?)
         LIMIT 1`,
        pathOnly,
        ipHash,
        userAgent,
        `-${pageViewDedupMinutes} minutes`,
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

app.get("/", async (req, res) => {
  res.locals.pageTitle = "Homepage";
  const db = await getDb();
  const latestDbNews = await db.all(
    `SELECT * FROM news_posts
     WHERE status = 'published'
     ORDER BY published_date DESC, id DESC
     LIMIT 6`,
  );

  res.render("pages/Homepage", {
    latestNews: legacyNewsFiles(6),
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
    return res.render("pages/news-detail", { post, images, formatThaiDate });
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

app.get("/admin/news", requireAdmin, async (req, res) => {
  const db = await getDb();
  const posts = await db.all(
    `SELECT * FROM news_posts ORDER BY published_date DESC, id DESC`,
  );

  res.render("admin/news-list", { posts, formatThaiDate });
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
  const db = await getDb();
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

  res.redirect("/admin/news");
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
  .then(() => {
    app.listen(port, () => {
      console.log(`App listening at port ${port}`);
      console.log("Admin: http://localhost:3000/admin");
    });
  })
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });
