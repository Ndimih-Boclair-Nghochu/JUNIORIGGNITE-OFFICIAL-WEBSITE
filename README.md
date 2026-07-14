# JuniorIgnite — Official Website (Frontend)

The public marketing & download site and the **Founder console** for
[JuniorIgnite](https://github.com/Ndimih-Boclair-Nghochu/JUNIORIGGNITE), the
offline-first school management system for nursery & primary schools in Cameroon.

This repository contains **only the frontend**. The backend API lives in the
desktop app repository (`JUNIORIGGNITE/server`) because it is directly tied to
the desktop application's data and licensing.

## What's inside

**Public site** (3 pages, fully responsive):

- **Home** — hero, live download/school/student stats, feature grid, "how it
  works", an embedded YouTube video guide, a prominent **Download** section, and
  a downloadable **setup guide (PDF)**.
- **About** — mission, values, who it's for.
- **Contact** — contact details + a working contact form.

**Founder console** (`/founder`) — private dashboard for the founder:

- Total downloads, schools onboard, active users and students managed.
- Charts: downloads over time, schools by region.
- A school-accounts table to **grant/revoke report-card generation**, and to
  **suspend/activate** any school account.

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · React Router · Recharts · lucide-react.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5180
```

The site runs **standalone in demo mode** with seeded sample data, so you can
review everything without the backend. Demo founder login:

```
founder@juniorignite.app  /  founder123
```

To connect the real backend, copy `.env.example` to `.env` and set
`VITE_API_BASE_URL` to your running API (default `http://localhost:4000`), then
start the server from the desktop app repo (`JUNIORIGGNITE/server`).

## Build

```bash
npm run build      # outputs to dist/
npm run preview
```

`dist/` is a static bundle — deploy it to any static host (Netlify, Vercel,
GitHub Pages, S3, …).

## How the frontend talks to the backend

All API access goes through [`src/lib/api.ts`](src/lib/api.ts). Every call tries
the live backend first and **falls back to seeded demo data**
([`src/lib/mock.ts`](src/lib/mock.ts)) if the server is unreachable, so the site
is always explorable. Endpoints used:

| Purpose | Endpoint |
| --- | --- |
| Public stats (home) | `GET /api/stats/public` |
| Record a download | `POST /api/download` |
| Contact form | `POST /api/contact` |
| Founder login | `POST /api/founder/login` |
| Founder overview | `GET /api/founder/overview` |
| List schools | `GET /api/founder/schools` |
| Update a school (permissions/status) | `PATCH /api/founder/schools/:id` |

## Configuration

Edit [`src/lib/config.ts`](src/lib/config.ts) to change the YouTube video id,
version/size shown on the download button, and contact details without touching
components.
