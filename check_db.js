try {
  require("dotenv").config();
} catch (err) {
  if (err?.code !== "MODULE_NOT_FOUND") {
    throw err;
  }
}

const { getDb, getDbInfo } = require("./lib/db");

async function checkDatabase() {
  try {
    const db = await getDb();
    const dbInfo = getDbInfo();

    console.log("\n========== DATABASE INFO ==========");
    console.log("Database Info:", dbInfo);

    const newsCount = await db.get("SELECT COUNT(*) as count FROM news_posts");
    const viewsCount = await db.get("SELECT COUNT(*) as count FROM page_views");

    console.log("\n========== TABLE COUNTS ==========");
    console.log("news_posts count:", newsCount?.count || 0);
    console.log("page_views count:", viewsCount?.count || 0);

    if (newsCount?.count > 0) {
      console.log("\n========== SAMPLE NEWS ==========");
      const samples = await db.all("SELECT id, title, created_at FROM news_posts LIMIT 3");
      console.log(samples);
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkDatabase();
