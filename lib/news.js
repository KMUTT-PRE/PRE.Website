const crypto = require("crypto");

const CATEGORY_LABELS = {
  news: "ข่าวสาร",
  reward: "รางวัล",
  scholarships: "ทุนการศึกษา",
  hiring: "รับสมัคร",
  club: "ชมรมมด",
  event: "กิจกรรม",
};

function makeSlug(value) {
  const base = value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

  return base || `news-${Date.now()}`;
}

function formatThaiDate(dateText) {
  if (!dateText) {
    return "";
  }

  const date = new Date(`${dateText}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) {
    return dateText;
  }

  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function normalizeNewsInput(body, file) {
  const category = body.category || "news";
  const branches = Array.isArray(body.branches)
    ? body.branches.join(",")
    : body.branches || "";

  return {
    title: (body.title || "").trim(),
    slug: makeSlug(body.slug || body.title || ""),
    category,
    category_label: CATEGORY_LABELS[category] || "ข่าวสาร",
    branches,
    published_date: body.published_date || new Date().toISOString().slice(0, 10),
    cover_image: file ? `/uploads/news/${file.filename}` : body.current_cover_image || "",
    summary: (body.summary || "").trim(),
    content: (body.content || "").trim(),
    status: body.status || "published",
  };
}

function hashIp(ip) {
  return crypto
    .createHash("sha256")
    .update(`${ip || ""}:${process.env.ANALYTICS_SALT || "pre-website"}`)
    .digest("hex");
}

module.exports = {
  CATEGORY_LABELS,
  formatThaiDate,
  hashIp,
  makeSlug,
  normalizeNewsInput,
};
