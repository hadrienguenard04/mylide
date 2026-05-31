// scripts/capture-screenshots.js
// Génère les screenshots Play Store manquants (téléphone + tablette 7")
// Usage : node scripts/capture-screenshots.js
// Prérequis : npm install puppeteer --save-dev

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const APP_URL = "http://localhost:5173"; // vite dev server
const OUT_DIR = path.join(__dirname, "../public/screenshots");

const DEVICES = [
  { name: "phone-1", width: 1080, height: 1920, label: "Téléphone" },
  { name: "tablet-7", width: 1200, height: 1920, label: "Tablette 7\"" },
];

// Pages à capturer : route = hash ou path, waitSelector = élément à attendre
const PAGES = [
  { route: "/", hash: "", label: "home" },
  { route: "/", hash: "#sport", label: "sport" },
  { route: "/", hash: "#nutrition", label: "nutrition" },
];

async function capture() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const device of DEVICES) {
    console.log(`\n📱 Capturing ${device.label} (${device.width}x${device.height})...`);
    const page = await browser.newPage();
    await page.setViewport({ width: device.width, height: device.height, deviceScaleFactor: 1 });

    // Login requis — adapter avec tes credentials de test si besoin
    // await page.goto(`${APP_URL}/auth`);

    for (const p of PAGES) {
      const url = `${APP_URL}${p.route}${p.hash}`;
      await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });
      await new Promise(r => setTimeout(r, 1500)); // laisser les animations se terminer

      const filename = `${device.name}-${p.label}.png`;
      const filepath = path.join(OUT_DIR, filename);
      await page.screenshot({ path: filepath, fullPage: false });
      console.log(`  ✅ ${filename}`);
    }

    await page.close();
  }

  await browser.close();
  console.log(`\nDone. Screenshots dans public/screenshots/`);
}

capture().catch(e => { console.error(e); process.exit(1); });
