# JuniorIgnite — Monorepo

Everything for **JuniorIgnite**, the offline-first school management system for
nursery & primary schools in Cameroon, in one repository:

```
.                     ← Official website (React + Vite frontend) + Founder console
├── desktop/          ← The JuniorIgnite desktop app (Electron + React + SQLite)
└── server/           ← Backend API (Express) powering the website & founder console
```

Each part is independent — its own `package.json`, its own install and run.

---

## 1. Website (repository root)

The public marketing & download site and the private **Founder console**.

- **Public site** (responsive): Home (hero, live stats, features, how-it-works,
  embedded YouTube guide, prominent Download + downloadable setup guide PDF),
  About, and Contact (with a working form).
- **Founder console** (`/founder`): downloads / schools / users / students
  stats, charts, and a school-accounts table to grant/revoke report-card
  generation and suspend/activate accounts.

```bash
npm install
npm run dev          # http://localhost:5180
```

Runs standalone in demo mode (seeded data). Demo founder login:
`founder@juniorignite.app` / `founder123`. To use the real backend, copy
`.env.example` to `.env` and set `VITE_API_BASE_URL` (default
`http://localhost:4000`). See [`src/lib/api.ts`](src/lib/api.ts) for the
endpoints used.

## 2. Desktop app — [`desktop/`](desktop/)

The installable Electron application schools run offline. Full details,
architecture and build/packaging instructions are in
[`desktop/README.md`](desktop/README.md).

```bash
cd desktop
npm install
npm run dev          # develop
npm run package:win  # build the Windows installer (release/JuniorIgnite Setup <version>.exe)
```

## 3. Backend API — [`server/`](server/)

Express API that serves the website's public stats, records downloads, handles
the contact form, ingests telemetry from desktop installations, and powers the
founder console (auth, aggregate stats, and per-school permission control —
including remotely granting a school permission to generate report cards).

```bash
cd server
cp .env.example .env
npm install
npm run dev          # http://localhost:4000
```

> The server is the cloud counterpart of the desktop app's sync/licensing
> stubs. It is deliberately storage-light so it can be deployed anywhere.

---

## How the pieces fit together

- Schools **download** the desktop app from the website and run it fully
  **offline**.
- When online, the desktop app can report anonymous **telemetry** (school
  registered, student counts, usage) to the **backend**.
- The **founder** signs in to the website's console to see platform-wide numbers
  and to **manage school accounts** — e.g. granting a school permission to
  generate report cards, which the desktop app honours on its next sync.
