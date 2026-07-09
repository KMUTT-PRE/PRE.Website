const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const dbFile = path.join(__dirname, "..", "data", "site.sqlite");

let dbPromise;

async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: dbFile,
      driver: sqlite3.Database,
    });
  }

  return dbPromise;
}

async function initDb() {
  const db = await getDb();

  await db.exec(`
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

module.exports = {
  getDb,
  initDb,
};
