// Prints the visible text of a page after its scripts have run.
// For leaderboards that draw their tables in the browser (LiveBench, Vals).
// Needs Playwright:  npm i --no-save playwright@1.49.1 && npx playwright install chromium
// Usage: node scripts/render.mjs <url> [wait-ms]
import { chromium } from "playwright";

const [url, wait = "4000"] = process.argv.slice(2);
if (!url) { console.error("usage: node scripts/render.mjs <url> [wait-ms]"); process.exit(2); }

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(Number(wait));
  console.log(await page.evaluate(() => document.body.innerText));
} finally {
  await browser.close();
}
