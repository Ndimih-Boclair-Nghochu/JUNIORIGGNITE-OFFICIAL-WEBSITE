import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'fr'

const STORAGE_KEY = 'ji_lang'

/**
 * Site copy in both languages. Cameroon is bilingual, so the public site must
 * read naturally in French as well as English. Keys are dotted paths; a missing
 * French string falls back to English rather than rendering the raw key.
 */
const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.download': 'Download',
    'nav.downloadApp': 'Download the app',
    'nav.menu': 'Menu',

    'hero.eyebrow': 'Offline School Management · Cameroon',
    'hero.title1': 'Run your school,',
    'hero.title2': 'even without internet',
    'hero.subtitle':
      'JuniorIgnite is the complete desktop system for nursery & primary schools — students, attendance, marks, report cards, ID cards and fees, all running fully offline on your computer.',
    'hero.downloadWindows': 'Download for Windows',
    'hero.watchGuide': 'Watch the guide',
    'hero.worksOffline': 'Works fully offline',
    'hero.windows': 'Windows 10 & 11',
    'hero.bilingual': 'English & French',

    'stats.downloads': 'Downloads',
    'stats.schools': 'Schools onboard',
    'stats.students': 'Students managed',
    'stats.offline': 'Offline capable',

    'features.eyebrow': 'Everything in one place',
    'features.title': 'Built for how schools actually work',
    'features.subtitle':
      'One installation covers the entire school office — no monthly fees, no internet dependency, no data leaving your computer.',

    'steps.eyebrow': 'Get started in minutes',
    'steps.title': 'From download to your first report card',
    'steps.subtitle':
      'No servers to configure, no technical skills required. Download, install with the guide, and you are running.',

    'footer.explore': 'Explore',
    'footer.contact': 'Contact',
    'footer.rights': 'All rights reserved.',
    'footer.poweredBy': 'Powered by ELIGNITE',

    'contact.title': 'Contact us',
    'contact.name': 'Your name',
    'contact.email': 'Email address',
    'contact.organization': 'School / organisation (optional)',
    'contact.message': 'Message',
    'contact.send': 'Send message',
    'contact.sending': 'Sending…',
    'contact.sent': 'Thank you — your message has been sent.',
    'contact.error': 'Could not send your message. Please try again.',
    'contact.labelEmail': 'Email',
    'contact.labelPhone': 'Phone',
    'contact.labelLocation': 'Location',
    'contact.labelHours': 'Hours'
  },
  fr: {
    'nav.home': 'Accueil',
    'nav.about': 'À propos',
    'nav.contact': 'Contact',
    'nav.download': 'Télécharger',
    'nav.downloadApp': "Télécharger l'application",
    'nav.menu': 'Menu',

    'hero.eyebrow': 'Gestion scolaire hors ligne · Cameroun',
    'hero.title1': 'Gérez votre école,',
    'hero.title2': 'même sans internet',
    'hero.subtitle':
      "JuniorIgnite est le système complet pour les écoles maternelles et primaires — élèves, présences, notes, bulletins, cartes scolaires et frais, le tout fonctionnant entièrement hors ligne sur votre ordinateur.",
    'hero.downloadWindows': 'Télécharger pour Windows',
    'hero.watchGuide': 'Voir le guide',
    'hero.worksOffline': 'Fonctionne hors ligne',
    'hero.windows': 'Windows 10 & 11',
    'hero.bilingual': 'Anglais & Français',

    'stats.downloads': 'Téléchargements',
    'stats.schools': 'Écoles inscrites',
    'stats.students': 'Élèves gérés',
    'stats.offline': 'Hors ligne',

    'features.eyebrow': 'Tout au même endroit',
    'features.title': 'Conçu pour le fonctionnement réel des écoles',
    'features.subtitle':
      "Une seule installation couvre tout le secrétariat — aucun abonnement mensuel, aucune dépendance à internet, aucune donnée ne quitte votre ordinateur.",

    'steps.eyebrow': 'Démarrez en quelques minutes',
    'steps.title': 'Du téléchargement à votre premier bulletin',
    'steps.subtitle':
      "Aucun serveur à configurer, aucune compétence technique requise. Téléchargez, installez avec le guide, et c'est parti.",

    'footer.explore': 'Explorer',
    'footer.contact': 'Contact',
    'footer.rights': 'Tous droits réservés.',
    'footer.poweredBy': 'Propulsé par ELIGNITE',

    'contact.title': 'Contactez-nous',
    'contact.name': 'Votre nom',
    'contact.email': 'Adresse e-mail',
    'contact.organization': 'École / organisation (facultatif)',
    'contact.message': 'Message',
    'contact.send': 'Envoyer le message',
    'contact.sending': 'Envoi…',
    'contact.sent': 'Merci — votre message a été envoyé.',
    'contact.error': "Impossible d'envoyer votre message. Veuillez réessayer.",
    'contact.labelEmail': 'E-mail',
    'contact.labelPhone': 'Téléphone',
    'contact.labelLocation': 'Localisation',
    'contact.labelHours': 'Horaires'
  }
}

interface Ctx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const LanguageContext = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: (k) => k })

function initialLang(): Lang {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  if (saved === 'en' || saved === 'fr') return saved
  // Fall back to the browser's preference — useful for francophone visitors.
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('fr')) return 'fr'
  return 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }): JSX.Element {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => setLangState(l), [])

  // English is the fallback so a missing French string never shows a raw key.
  const t = useCallback((key: string) => STRINGS[lang][key] ?? STRINGS.en[key] ?? key, [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useT(): Ctx {
  return useContext(LanguageContext)
}
