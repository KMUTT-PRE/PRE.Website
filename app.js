const express = require("express");
const app = express();
const port = 3000;
const fs = require("fs");
const path = require("path");

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  // พิมพ์ตรวจสอบ Path ใน Terminal
  console.log("Current Directory:", __dirname);

  const newsDir = path.join(__dirname, "views", "news", "2569");
  let latestNews = [];

  try {
    if (fs.existsSync(newsDir)) {
      latestNews = fs
        .readdirSync(newsDir)
        .filter((file) => file.endsWith(".ejs"))
        .map((file) => file.replace(".ejs", ""))
        .sort()
        .reverse()
        .slice(0, 6);
      console.log("Found News Files:", latestNews);
    } else {
      console.error("Path NOT Found:", newsDir);
    }
  } catch (err) {
    console.error("Error reading directory:", err);
  }

  res.render("pages/Homepage", { latestNews: latestNews });
});

app.get("/pre", (req, res) => {
  res.render("pages/PRE");
});

app.get("/mce", (req, res) => {
  res.render("pages/MCE");
});

app.get("/isee", (req, res) => {
  res.render("pages/ISEE");
});

app.get("/m_eng", (req, res) => {
  res.render("pages/M_Eng");
});

app.get("/ph_d", (req, res) => {
  res.render("pages/Ph_D");
});

app.get("/TABEE", (req, res) => {
  res.render("pages/TABEE");
});

app.get("/history_dep", (req, res) => {
  res.render("pages/history_dep");
});

app.get("/instrument", (req, res) => {
  res.render("pages/instrument");
});

app.get("/myteam", (req, res) => {
  res.render("pages/myteam");
});

app.get("/document", (req, res) => {
  res.render("pages/document");
});

app.get("/cdp", (req, res) => {
  res.render("pages/cdp");
});

app.get("/scholarship", (req, res) => {
  res.render("pages/scholarship");
});

app.get("/news", (req, res) => {
  const newsDir = path.join(__dirname, "views/news/2569");
  let newsFiles = [];
  let carouselNews = [];

  try {
    newsFiles = fs
      .readdirSync(newsDir)
      .filter((file) => file.endsWith(".ejs"))
      .map((file) => file.replace(".ejs", ""))
      .sort()
      .reverse();

    carouselNews = newsFiles.slice(0, 5);
  } catch (err) {
    console.error("Error:", err);
  }

  res.render("pages/news", {
    newsFiles: newsFiles,
    carouselNews: carouselNews,
  });
});

app.get("/news/:postID", (req, res) => {
  const postID = req.params.postID;

  const viewPath = `news/2569/news/${postID}`;

  res.render(viewPath, (err, html) => {
    if (err) {
      console.error("หาไฟล์ไม่พบที่ Path:", viewPath);
      res.status(404).send("404 Not Found");
    } else {
      res.send(html);
    }
  });
});

app.get("/myteam2", (req, res) => {
  res.render("pages/myteam2");
});

app.get("/research", (req, res) => {
  res.render("pages/research");
});

app.get("/personel/:name", (req, res) => {
  const name = req.params.name;
  res.render(`pages/personel/${name}`);
});

app.listen(port, () => {
  console.log(`App listening at port ${port}`);
});
