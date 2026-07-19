import { useEffect, useState } from 'react'
import { api } from './api'
import { SITE } from './config'
import type { SiteSettings } from './types'

/** Values used until the server responds (and if it never does). */
const FALLBACK: SiteSettings = {
  email: SITE.contact.email,
  phone: SITE.contact.phone,
  address: SITE.contact.address,
  hours: SITE.contact.hours,
  eligniteUrl: 'https://elignite.com',
  youtube: SITE.social.youtube,
  facebook: SITE.social.facebook,
  updatedAt: null
}

// Fetched once per page load and shared by every component that asks for it,
// so the footer, contact page and about page can't drift apart.
let cache: SiteSettings | null = null
let inflight: Promise<SiteSettings> | null = null

/**
 * Contact details and links as configured by the founder. Updating them in the
 * console changes every place they appear on the site, with no redeploy.
 */
export function useSiteSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(cache ?? FALLBACK)

  useEffect(() => {
    if (cache) return
    inflight ??= api
      .siteSettings()
      .then((s) => {
        cache = s
        return s
      })
      .catch(() => FALLBACK)
    inflight.then(setSettings)
  }, [])

  return settings
}
