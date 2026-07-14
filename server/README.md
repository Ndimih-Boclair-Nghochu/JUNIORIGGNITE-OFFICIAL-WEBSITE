# JuniorIgnite — Backend API

Express + TypeScript API that powers the JuniorIgnite website and founder
console, and ingests telemetry from desktop installations. Dependency-light
(no native modules): data is persisted to a JSON file under `data/`, so it runs
anywhere Node runs. The storage layer ([`src/store.ts`](src/store.ts)) is small
and can be swapped for SQLite/Postgres later without touching the routes.

## Run

```bash
cp .env.example .env      # optional — sensible defaults are built in
npm install
npm run dev               # http://localhost:4000  (tsx watch)
# or
npm run build && npm start
```

On first run it seeds demo data (downloads, ~12 schools, a founder account) so
the site and dashboard are populated immediately. Delete `data/db.json` to reseed.

Default founder login (change via `.env`): `founder@juniorignite.app` / `founder123`.

## Endpoints

Public:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | liveness check |
| GET | `/api/stats/public` | downloads / schools / students / active users (home page) |
| POST | `/api/download` | record a download, returns installer url + version |
| POST | `/api/contact` | store a contact-form message |

Telemetry (called by desktop installs when online):

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/telemetry/register` | register/identify a school install; returns its `key` + permissions |
| POST | `/api/telemetry/heartbeat` | report student/teacher/user counts; returns current permissions |
| GET | `/api/telemetry/permission/:key` | desktop checks whether it may generate report cards |

Founder (Bearer token from `/api/founder/login`):

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/founder/login` | returns a signed session token |
| GET | `/api/founder/overview` | aggregate stats + charts data |
| GET | `/api/founder/schools` | all school accounts |
| PATCH | `/api/founder/schools/:id` | grant/revoke report-card generation, suspend/activate |

## How it connects

- The **website frontend** (repo root) calls these endpoints; set
  `VITE_API_BASE_URL` there to this server's URL. Without it, the frontend falls
  back to seeded demo data.
- The **desktop app** (`../desktop`) posts telemetry here when online and reads
  `permission/:key` to honour report-card permissions granted by the founder —
  the cloud counterpart of the app's local sync/licensing stubs.

## Security notes

- Passwords are hashed with scrypt; founder sessions are stateless HMAC-signed
  tokens (`TOKEN_SECRET`). Set a strong `TOKEN_SECRET` in production and serve
  over HTTPS.
