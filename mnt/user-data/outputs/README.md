# VES Field Tool — Setup Guide

> **Want everyone's data in one shared database instead of per-device local
> storage?** See `backend/README.md` — it's a small server you run once, then
> connect every device to it from the app's Tools → Server sync section.
> Everything below still applies for running the app itself.

A single self-contained file: **`ves-field-tool.html`**. No install, no build step,
no internet connection needed once you have the file. It runs entirely inside a web
browser, and stores its data on the device it's used on.

Built for VES field work: enter AB/2 (m) and apparent resistivity (Ω·m) readings,
get a live log–log sounding curve, save multiple surveys, and print a report.

---

## 1. Open it on your laptop (fastest)

1. Download `ves-field-tool.html` to your laptop.
2. Double-click it, or right-click → **Open with** → Chrome / Edge / Firefox.
3. That's it — the app loads and works fully offline.

This is enough for testing, data entry from a laptop, and printing reports.
Two minor browser features (GPS capture, and file downloads on some strict
setups) work more reliably if the file is served over `http://` instead of
opened directly as a `file://` path — see the optional step below if GPS
capture doesn't work when double-clicked.

### Optional: serve it locally (fixes GPS / download quirks on some browsers)

Pick whichever you have installed:

**Python (most laptops already have it):**
```bash
cd folder-with-the-file
python3 -m http.server 8000
```
Then open `http://localhost:8000/ves-field-tool.html` in your browser.

**Node.js:**
```bash
npx serve .
```
Then open the local URL it prints (usually `http://localhost:3000`).

**VS Code:** install the "Live Server" extension, right-click the HTML file →
**Open with Live Server**.

---

## 2. Put it on your phone

**Simplest — no setup at all:**
1. Send `ves-field-tool.html` to your phone (WhatsApp, email, Bluetooth, USB
   cable, Google Drive — anything).
2. Open the file from your phone's file manager / downloads with **Chrome**
   (Android) or a browser that can open local files.
3. In Chrome's menu (⋮) tap **Add to Home screen**. You now have an icon that
   opens the app like a normal app, still fully offline.

**If you want a proper installed "app" experience (recommended for daily field use):**
1. Put the file on any simple web host your team controls — even a free static
   host such as GitHub Pages, Netlify, or Cloudflare Pages — or serve it from a
   laptop over the office WiFi with the `python3 -m http.server 8000` command
   above (phone and laptop must be on the same network; use the laptop's IP
   instead of `localhost`, e.g. `http://192.168.1.20:8000/ves-field-tool.html`).
2. Open that URL on the phone in Chrome.
3. Tap **Add to Home screen**. Because it's loaded over `http://`/`https://`
   rather than a raw file, Chrome treats it more like a real installed app
   (own icon, opens without browser address bar).

**If you eventually want a real installable Android/iOS app package** (e.g. to
distribute via your organisation's MDM or an APK), the standard next step is
to wrap this same HTML file with a tool such as **Capacitor** or
**PWABuilder** — that turns it into a native app shell without rewriting any
of the app logic. That requires Android Studio / Xcode and is a separate,
optional step beyond what's needed for day-to-day field use.

---

## 3. Using the app

- **Survey tab** — site details, GPS capture, the AB/2 / ρa data table, and
  the live log–log sounding curve.
- **Report tab** — a print-ready field report (letterhead, site info, curve,
  data table, signature lines). Use your browser's Print → Save as PDF.
- **Saved tab** — every survey you save stays on this device/browser. Open,
  duplicate, export as CSV, or delete.
- **Tools tab** —
  - Office/letterhead profile (upload your office logo, it appears in the
    app header and on the printed report)
  - A raw-reading calculator (current + voltage → apparent resistivity, for
    Schlumberger or Wenner arrays) if your instrument gives raw readings
    instead of computed ρa
  - Paste-in bulk data import, CSV export, and a full JSON backup/restore for
    all saved surveys

**Data lives in the browser's local storage on that one device.** It is not
synced anywhere automatically. Export a JSON backup (Tools tab) regularly,
especially before clearing browser data, switching phones, or handing a
device back — and after a day of fieldwork.

The app deliberately does **not** attempt to auto-interpret layer
resistivity/thickness from the curve — that stays a job for the reviewing
hydrogeologist. It focuses on clean data capture, a correct log–log plot,
and a consistent field report.
