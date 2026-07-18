// Playwright screenshot script for Golden Key Dubai
// Uses the local playwright install at C:\Users\novra\Desktop\prof\node_modules
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const outDir = "G:/Users/novra/Desktop/golden-key-dubai/screenshots";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  locale: "ru-RU",
});
const page = await ctx.newPage();

const shots = [
  { name: "01-landing-hero",      url: "http://127.0.0.1:8765/", wait: 1500, full: false },
  { name: "02-landing-fullpage",  url: "http://127.0.0.1:8765/", wait: 2500, full: true },
  { name: "03-catalog-section",   url: "http://127.0.0.1:8765/#catalog", wait: 3500, full: false },
  { name: "04-docs-page",         url: "http://127.0.0.1:8765/docs", wait: 2000, full: false },
  { name: "05-docs-fullpage",     url: "http://127.0.0.1:8765/docs", wait: 2000, full: true },
  { name: "06-404-page",          url: "http://127.0.0.1:8765/this-path-does-not-exist", wait: 1500, full: false },
];

const results = [];
for (const s of shots) {
  const t0 = Date.now();
  try {
    const resp = await page.goto(s.url, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(s.wait);
    const file = path.join(outDir, s.name + ".png");
    await page.screenshot({ path: file, fullPage: s.full });
    const size = fs.statSync(file).size;
    const ms = Date.now() - t0;
    results.push({ name: s.name, status: resp.status(), size_kb: Math.round(size / 1024), ms, file });
  } catch (e) {
    results.push({ name: s.name, error: e.message });
  }
}

// Bonus: open the 3D tour dialog for property id=1 (Burj Khalifa Penthouse) and screenshot
try {
  await page.goto("http://127.0.0.1:8765/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  // Scroll to catalog
  await page.evaluate(() => document.querySelector("#catalog")?.scrollIntoView());
  await page.waitForTimeout(1500);
  // Find any "3D" tour button on a card and click it
  const tourClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button"))
      .find((b) => /3D|тур/i.test(b.textContent || ""));
    if (btn) { btn.click(); return true; }
    return false;
  });
  await page.waitForTimeout(4000); // let model-viewer load
  const file = path.join(outDir, "07-3d-tour-dialog.png");
  await page.screenshot({ path: file, fullPage: false });
  const size = fs.statSync(file).size;
  results.push({ name: "07-3d-tour-dialog", tour_clicked: tourClicked, size_kb: Math.round(size / 1024), file });
} catch (e) {
  results.push({ name: "07-3d-tour-dialog", error: e.message });
}

await browser.close();

console.log(JSON.stringify(results, null, 2));
