const test = require("node:test");
const assert = require("node:assert/strict");

const { linkifyText } = require("../lib/news");

test("linkifyText converts HTTP URLs into safe links", () => {
  assert.equal(
    linkifyText("อ่านต่อ https://example.com/news?id=1&lang=th"),
    'อ่านต่อ <a href="https://example.com/news?id=1&amp;lang=th" target="_blank" rel="noopener noreferrer">https://example.com/news?id=1&amp;lang=th</a>',
  );
});

test("linkifyText supports www URLs and keeps punctuation outside the link", () => {
  assert.equal(
    linkifyText("ดูที่ www.example.com/news."),
    'ดูที่ <a href="https://www.example.com/news" target="_blank" rel="noopener noreferrer">www.example.com/news</a>.',
  );
});

test("linkifyText escapes HTML and rejects non-HTTP link schemes", () => {
  assert.equal(
    linkifyText('<script>alert("xss")</script> javascript:alert(1)'),
    "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; javascript:alert(1)",
  );
});
