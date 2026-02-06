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

app.get("/B_Eng", (req, res) => {
  res.render("pages/B_Eng");
});

app.get("/M_eng&PH_D", (req, res) => {
  res.render("pages/M_eng&PH_D");
});

app.get("/news", (req, res) => {
  res.render("pages/news");
});

app.get("/personel/p00_xomporn", (req, res) => {
  res.render("pages/personel/p00_xomporn");
});

app.get("/personel/p01_bovornchok", (req, res) => {
  res.render("pages/personel/p01_bovornchok");
});

app.get("/personel/p02_viboon", (req, res) => {
  res.render("pages/personel/p02_viboon");
});

app.get("/personel/p03_kongkiat", (req, res) => {
  res.render("pages/personel/p03_kongkiat");
});

app.get("/personel/p04_ussaneei", (req, res) => {
  res.render("pages/personel/p04_ussaneei");
});
app.get("/personel/p05_chaiya", (req, res) => {
  res.render("pages/personel/p05_chaiya");
});

app.get("/personel/p06_phromphong", (req, res) => {
  res.render("pages/personel/p06_phromphong");
});

app.get("/personel/p07_chorkaew", (req, res) => {
  res.render("pages/personel/p07_chorkaew");
});

app.get("/personel/p08_supparerk", (req, res) => {
  res.render("pages/personel/p08_supparerk");
});

app.get("/personel/p09_jessada", (req, res) => {
  res.render("pages/personel/p09_jessada");
});
app.get("/personel/p10_mongkol", (req, res) => {
  res.render("pages/personel/p10_mongkol");
});

app.get("/personel/p11_pongsak", (req, res) => {
  res.render("pages/personel/p11_pongsak");
});

app.get("/personel/p12_sombun", (req, res) => {
  res.render("pages/personel/p12_sombun");
});

app.get("/personel/p13_chanakan", (req, res) => {
  res.render("pages/personel/p13_chanakan");
});

app.get("/personel/p14_charoenchai", (req, res) => {
  res.render("pages/personel/p14_charoenchai");
});
app.get("/personel/p15_pinet", (req, res) => {
  res.render("pages/personel/p15_pinet");
});

app.get("/personel/p16_pochamarn", (req, res) => {
  res.render("pages/personel/p16_pochamarn");
});

app.get("/personel/p17_paiboon", (req, res) => {
  res.render("pages/personel/p17_paiboon");
});

app.get("/personel/p18_chettapong", (req, res) => {
  res.render("pages/personel/p18_chettapong");
});

app.get("/personel/p19_titinan", (req, res) => {
  res.render("pages/personel/p19_titinan");
});
app.get("/personel/p20_nopnarong", (req, res) => {
  res.render("pages/personel/p20_nopnarong");
});

app.get("/personel/p21_noppadon", (req, res) => {
  res.render("pages/personel/p21_noppadon");
});

app.get("/personel/p22_chanuphon", (req, res) => {
  res.render("pages/personel/p22_chanuphon");
});

app.get("/personel/p23_suriyaphong", (req, res) => {
  res.render("pages/personel/p23_suriyaphong");
});

app.get("/personel/p24_ittirit", (req, res) => {
  res.render("pages/personel/p24_ittirit");
});

app.get("/personel/p27_chaowalit", (req, res) => {
  res.render("pages/personel/p27_chaowalit");
});

app.listen(port, () => {
  console.log(`App listening at port ${port}`);
});
