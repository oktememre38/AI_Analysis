// Prints the visible text of a page after its scripts have run.
// For leaderboards that draw their tables in the browser (LiveBench, Vals),
// and for pages that refuse plain fetches (LMArena, help centers).
// Needs the Playwright package:  npm i --no-save playwright@1.49.1
// Uses a Chromium already on the machine when there is one (cloud images keep
// them under /opt/pw-browsers); otherwise run `npx playwright install chromium`.
// Usage: node scripts/render.mjs <url> [wait-ms]
import { chromium } from "playwright";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [url, wait = "4000"] = process.argv.slice(2);
if (!url) { console.error("usage: node scripts/render.mjs <url> [wait-ms]"); process.exit(2); }

function findChromium() {
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) return process.env.CHROMIUM_PATH;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/pw-browsers", join(process.env.HOME || "", ".cache/ms-playwright")].filter(Boolean);
  for (const root of roots) {
    if (!existsSync(root)) continue;
    // Newest build first; full Chromium before the headless shell
    const dirs = readdirSync(root).filter(d => d.startsWith("chromium")).sort().reverse();
    for (const d of dirs) {
      for (const rel of ["chrome-linux/chrome", "chrome-linux/headless_shell", "chrome-linux64/chrome"]) {
        const p = join(root, d, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  for (const p of ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]) if (existsSync(p)) return p;
  return undefined; // let Playwright use its own download
}

const executablePath = findChromium();
const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ locale: "en-US" });
  // Some leaderboards keep a live connection open, so "networkidle" never comes:
  // load the document, then give its scripts a fixed time to draw the table
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(Number(wait));
  console.log(await page.evaluate(() => document.body.innerText));
} finally {
  await browser.close();
}
