#!/usr/bin/env node
/**
 * Migrate news data from SQLite to PostgreSQL
 * Usage: node migrate_news.js
 */

require("dotenv").config();

const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const pg = require("pg");

async function migrateNews() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable not set");
    console.error("Set DATABASE_URL before running this script");
    process.exit(1);
  }

  let sqliteDb;
  let pgPool;

  try {
    // Open SQLite database
    console.log("[1/5] Opening SQLite database...");
    sqliteDb = await open({
      filename: path.join(__dirname, "data", "site.sqlite"),
      driver: sqlite3.Database,
    });

    // Connect to PostgreSQL
    console.log("[2/5] Connecting to PostgreSQL...");
    pgPool = new pg.Pool({ connectionString: databaseUrl });

    // Get news from SQLite
    console.log("[3/5] Reading news from SQLite...");
    const news = await sqliteDb.all(`
      SELECT 
        id, title, slug, category, category_label, branches, 
        published_date, cover_image, summary, content, status, 
        created_at, updated_at
      FROM news_posts
      ORDER BY id
    `);

    if (news.length === 0) {
      console.log("No news found in SQLite");
      process.exit(0);
    }

    console.log(`Found ${news.length} news articles in SQLite`);

    // Insert into PostgreSQL
    console.log("[4/5] Inserting into PostgreSQL...");
    let successCount = 0;
    let errorCount = 0;

    for (const article of news) {
      try {
        await pgPool.query(
          `INSERT INTO news_posts 
            (id, title, slug, category, category_label, branches, 
             published_date, cover_image, summary, content, status, 
             created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (id) DO NOTHING`,
          [
            article.id,
            article.title,
            article.slug,
            article.category,
            article.category_label,
            article.branches,
            article.published_date,
            article.cover_image,
            article.summary,
            article.content,
            article.status,
            article.created_at,
            article.updated_at,
          ],
        );
        successCount++;
      } catch (err) {
        console.error(`Error migrating article #${article.id}:`, err.message);
        errorCount++;
      }
    }

    console.log("[5/5] Migration complete");
    console.log(`✅ Successfully migrated: ${successCount} articles`);
    if (errorCount > 0) {
      console.log(`⚠️  Failed: ${errorCount} articles`);
    }

    // Verify
    const result = await pgPool.query("SELECT COUNT(*) as count FROM news_posts");
    console.log(`\nPostgreSQL now has ${result.rows[0].count} news articles`);

  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await sqliteDb?.close();
    await pgPool?.end();
  }
}

migrateNews();
