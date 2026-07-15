const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

test("production requires DATABASE_URL instead of falling back to SQLite", () => {
  const output = execFileSync(
    process.execPath,
    [
      "-e",
      [
        "process.env.NODE_ENV = 'production';",
        "delete process.env.DATABASE_URL;",
        "const { getDb } = require('./lib/db');",
        "getDb().then(() => process.exit(1)).catch((err) => {",
        "  console.log(err.message);",
        "  process.exit(err.message.includes('DATABASE_URL is required') ? 0 : 1);",
        "});",
      ].join(" "),
    ],
    {
      cwd: path.join(__dirname, ".."),
      encoding: "utf8",
    },
  );

  assert.match(output, /DATABASE_URL is required/);
});
