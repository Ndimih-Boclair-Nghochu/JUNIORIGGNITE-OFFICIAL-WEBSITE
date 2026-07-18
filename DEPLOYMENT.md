# JuniorIgnite Website — Deployment Guide

The site is a static Vite SPA plus an optional Express backend (`server/`). It runs
**standalone** without the backend (seeded demo data + static installer download);
the backend adds real stats, download counting, the contact inbox, telemetry, and
the founder console.

Current release: **v1.1.2** (offline licensing + per-student fee, A6 receipts, A5 class report cards).

---

## 1. Frontend (static site)

Already built to `dist/` and deploy-ready, including:

- `dist/downloads/JuniorIgnite-Setup-1.1.2.exe` — the installer the Download
  button serves.
- SPA fallback config: `vercel.json` (Vercel) and `public/_redirects`
  (Netlify / Cloudflare Pages) — required so refreshing `/about`, `/founder`,
  etc. doesn't 404.

### Build
```bash
npm install
npm run build      # → dist/
```

### Deploy options
- **Vercel:** import the repo (root = this folder). `vercel.json` sets build
  command, output dir, and the SPA rewrite. Set `VITE_API_BASE_URL` in project
  env if using the backend.
- **Netlify / Cloudflare Pages:** build command `npm run build`, publish dir
  `dist`. `_redirects` handles SPA routing.
- **Own server (e.g. Nginx):** serve `dist/` as static root with
  `try_files $uri /index.html;` so client routes fall back to `index.html`.

> **Large installer note:** the 96 MB `.exe` is git-ignored (see `.gitignore`)
> to keep the repo light. It IS copied into `dist/` at build time, so an
> upload-the-`dist`-folder deploy includes it. For a **git-based** deploy
> (Vercel/Netlify pulling from the repo), the `.exe` won't be in the repo —
> either commit it deliberately, or host it on **GitHub Releases** and point
> `SITE.installerPath` (`src/lib/config.ts`) / the backend `INSTALLER_URL` at
> the release asset URL. To refresh the local copy after a new desktop build:
> `cp "../JUNIORIGGNITE/release/JuniorIgnite Setup 1.1.2.exe" public/downloads/JuniorIgnite-Setup-1.1.2.exe`

---

## 2. Backend API (optional, `server/`)

```bash
cd server
cp .env.example .env
npm install
npm run build && npm start   # http://localhost:4000
```

Then set `VITE_API_BASE_URL=https://your-api-host` for the frontend build.

### Before going live — required
- **`TOKEN_SECRET`** — set a strong random value (default is a placeholder).
- **`FOUNDER_EMAIL` / `FOUNDER_PASSWORD`** — change from the seeded defaults.
- **`INSTALLER_URL` / `APP_VERSION`** — already default to the 1.1.2 installer;
  override if hosting the `.exe` elsewhere (e.g. a GitHub Release URL).
- Serve over **HTTPS** (founder tokens are bearer tokens).

---

## 3. Release checklist for a new desktop version
1. Build the installer: `cd ../JUNIORIGGNITE && npm run package:win`.
2. Copy it into `public/downloads/` (see command above).
3. Bump `SITE.version` + `installerPath` in `src/lib/config.ts`, and the server
   `INSTALLER_URL` / `APP_VERSION` defaults.
4. `npm run build` and redeploy.
