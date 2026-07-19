/**
 * Site-wide configuration. Edit these to rebrand copy, links, and media
 * without touching component code.
 */
export const SITE = {
  name: 'JuniorIgnite',
  tagline: 'Igniting Young Minds',
  description:
    'The complete offline-first school management system for nursery and primary schools in Cameroon.',
  // The YouTube video guide (watchable directly on the site via embed).
  // Replace with the real video id once published.
  youtubeId: 'ysz5S6PUM-U',
  // Latest desktop release. The backend /api/download endpoint records the
  // download and redirects to the real installer; this is the display version.
  version: '1.1.2',
  installerSizeMb: 96,
  // Static path the installer is served from (see public/downloads). Used as the
  // download target when no backend is configured, so the site works standalone.
  installerPath: '/downloads/JuniorIgnite-Setup-1.1.2.exe',
  contact: {
    email: 'hello@juniorignite.app',
    phone: '+237 6 52 882 753',
    address: 'Bamenda, North West Region, Cameroon',
    hours: 'Mon – Sat: 8:00 AM – 6:00 PM'
  },
  social: {
    youtube: 'https://youtube.com/@juniorignite',
    facebook: 'https://facebook.com/juniorignite'
  }
} as const

/**
 * Base URL of the backend API.
 *
 * In production this MUST default to '' (same origin) so the deployed site calls
 * its own /api through nginx. Defaulting to localhost here previously meant a
 * build made without a .env silently pointed every visitor at their own machine
 * — the API calls failed and the UI quietly fell back to empty data.
 * Only development falls back to the local API server.
 */
export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? (import.meta.env.DEV ? 'http://localhost:4000' : '')
