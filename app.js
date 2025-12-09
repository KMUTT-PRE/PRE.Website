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

const HomeRoute = require("./routes/Home-new");
app.use("/", HomeRoute);

app.listen(port, () => {
  console.log(`App listening at port ${port}`);
});
