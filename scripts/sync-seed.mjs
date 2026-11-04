// Copies data.json into the seed block of index.html, so the page still has
// current data when data.json can't be fetched (e.g. opened as a local file).
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const data = JSON.parse(readFileSync(new URL("data.json", root), "utf8"));
const htmlPath = new URL("index.html", root);
const html = readFileSync(htmlPath, "utf8");

const open = '<script id="seed" type="application/json">';
const start = html.indexOf(open);
const end = html.indexOf("</script>", start);
if (start < 0 || end < 0) throw new Error("seed block not found in index.html");

const json = JSON.stringify(data).replace(/</g, "\\u003c");
writeFileSync(htmlPath, html.slice(0, start + open.length) + "\n" + json + "\n" + html.slice(end));
console.log("seed updated from data.json");
