const express = require("express");
const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("pages/Homepage");
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

app.get("/scholarship", (req, res) => {
  res.render("pages/scholarship");
});

app.get("/news", (req, res) => {
  res.render("pages/news");
});

app.get("/news/:postID", (req, res) => {
  const postID = req.params.postID;
  res.render(`news/2569/news/${postID}`);
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
