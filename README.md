# JuniorIgnite

**JuniorIgnite** is an offline-first desktop School Management System for Nursery and Primary schools in Cameroon. It runs completely without internet — every core workflow (registering a student, taking attendance, entering marks, generating report cards, printing ID cards, recording fees) works against a local encrypted database. Cloud sync and licensing are layered on top behind swappable service interfaces.

Built with **Electron + React + TypeScript + Tailwind CSS**, with a local **SQLite** database (encrypted, WAL mode) accessed only from the Electron main process.

---

## Quick start

```bash
npm install      # installs deps and rebuilds the native SQLite module for Electron
npm run dev      # launches the app with hot-reload
```

On first launch you'll see the **Setup Wizard**. Complete it once (school details + an administrator account) and the app seeds a small demo school so it's immediately explorable — two classes (one Anglophone `Class 5`, one Francophone `CM2`), teachers, students, marks, and a fee payment. The class **access codes** are shown once at the end of setup (and can be regenerated later under Classes) — teachers use these on the landing screen to open their class.

### Build & package

```bash
npm run typecheck   # tsc for both renderer and main/preload
npm run build       # type-check + bundle via electron-vite
npm run package:win # build a Windows NSIS installer via electron-builder
```

> **Windows native build note:** the SQLite driver is a native module. If `npm install` fails at `node-gyp rebuild` with "Could not find any Visual Studio installation", the bundled node-gyp is too old to recognize a newer VS. The `package.json` already pins a newer `node-gyp` via `overrides`; ensure the "Desktop development with C++" workload (MSVC + Windows SDK) is installed.

---

## Users & roles

- **Administrator** — full access. Logs in with the username/password created during setup.
- **Teacher** — no account. Each class has a secure access code (PIN) set by the admin. A teacher clicks their class card on the landing screen and enters the code to get access **scoped to that one class only**: attendance, marks entry, student viewing, and report previews. Teachers cannot reach settings, other classes, fees, or delete students.

Scoping is enforced in the **data-access layer** (every class-scoped IPC handler re-validates the class against the in-memory session in the main process), not just hidden in the UI.

---

## Architecture

```
electron/
  main/                  # Electron main process — the ONLY place SQLite is touched
    index.ts             # app lifecycle, window, launch-time integrity check
    db/
      connection.ts      # encrypted DB open (safeStorage-protected key), WAL, pragmas
      migrate.ts         # forward-only migration runner
      migrations/        # numbered .sql migrations (append-only)
      seed.ts            # demo data
    session/
      sessionManager.ts  # in-memory admin/teacher session + scope checks (enforcement chokepoint)
    services/
      auth.ts            # bcrypt password/PIN hashing, access-code generation
      license.ts         # signed local license token, grace mode, mock renewal
      backup.ts          # snapshot export / restore
      sync.ts            # swappable cloud-sync interface (mock) + conflict logic
      activityLog.ts     # audit log
      marksCompute.ts    # averages, positions, ranks, grades
      pdf/               # report card, ID card, receipt generators (pdf-lib + QR)
    ipc/                 # one file per domain; index.ts registers every ipcMain.handle
  preload/
    index.ts             # contextBridge exposing a narrow, typed window.api
shared/
  types.ts               # entity + payload types (shared by main and renderer)
  ipcChannels.ts         # channel-name constants
  apiContract.ts         # the window.api type, enforced on both sides
src/                     # renderer (React)
  i18n/                  # en.json / fr.json (i18next)
  store/                 # Zustand stores (auth, app)
  screens/               # setup-wizard, landing, admin/*, teacher/*
  components/            # shared UI (Sidebar, Modal, EmptyState, Spinner, ...)
```

### Data safety & power reliability
- SQLite runs in **WAL mode** with `synchronous=NORMAL`; every multi-step write is wrapped in a transaction.
- An **integrity check** runs on launch; the result is exposed via IPC.
- Attendance and marks **autosave** on each change (no explicit save button).
- The DB file is **encrypted at rest** (SQLCipher-style, via `better-sqlite3-multiple-ciphers`); the encryption key is generated locally and itself protected by the OS credential store through Electron's `safeStorage`.

### Bilingual support
UI strings are translated via i18next (`en`/`fr`, switchable in Settings). Independently, **each class carries a subsystem tag** (Anglophone / Francophone) that drives report-card, receipt, and ID-card terminology (e.g. *Continuous Assessment* vs *Devoirs*, *Term* vs *Trimestre*) regardless of the active UI language.

---

## Extension points for a real backend

The two network-facing concerns are stubbed behind clean interfaces so they can be swapped for real server calls without touching core logic:

### Licensing — `electron/main/services/license.ts`
Stores a signed, time-boxed token locally and validates it on launch with **no network required**. Past expiry the app enters a read-only **grace mode** (existing data stays viewable/exportable; new records are blocked via `assertNotReadOnly()` in write handlers). `renewLicense()` currently re-issues a token locally — replace its body with a call to your licensing server; the surrounding validation/grace logic is unchanged.

### Cloud sync — `electron/main/services/sync.ts`
Defines a `RemoteSyncTransport` interface (`pushChanges` / `pullChanges`). The default implementation is a local no-op mock. Every syncable row is timestamped with `last_modified_at` and a per-install `device_id`. Conflict handling:
- **Routine fields** resolve **last-write-wins**.
- **Protected entities** (published marks, fee payments) never auto-overwrite — a conflict row is recorded and surfaced in the admin **Sync Issues** screen with a side-by-side compare/resolve UI.

Use the **"Simulate conflict"** button on the Sync Issues screen to exercise the full resolution flow with no server. To go online, call `setSyncTransport()` with a real HTTP-backed transport.

### Backup — `electron/main/services/backup.ts`
Manual and restorable full-database snapshots (`VACUUM INTO` for a transactionally-consistent copy). Restore takes a safety snapshot first, then relaunches.

---

## Tech stack

| Concern | Choice |
|---|---|
| Desktop shell | Electron |
| UI | React + TypeScript + Tailwind CSS |
| Build/packaging | electron-vite + electron-builder |
| Local DB | SQLite via `better-sqlite3-multiple-ciphers` (encrypted, WAL) |
| State | Zustand |
| i18n | i18next / react-i18next |
| PDF | pdf-lib + `qrcode` |
| Charts | Recharts |
| Icons | lucide-react |
| Hashing | bcryptjs |

Generated PDFs and backups are written under Electron's `userData` directory (`exports/`, `backups/`); uploaded photos/logos under `uploads/`.
