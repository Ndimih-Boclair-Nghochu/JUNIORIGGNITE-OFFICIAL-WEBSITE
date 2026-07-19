import { useEffect } from 'react'
import { Routes, Route, Outlet, useLocation, Navigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import FounderLogin from './pages/FounderLogin'
import FounderDashboard from './pages/FounderDashboard'
import { api } from './lib/api'
import { LanguageProvider } from './lib/i18n'

function ScrollManager(): null {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    window.scrollTo({ top: 0 })
  }, [pathname, hash])
  return null
}

function PublicLayout(): JSX.Element {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

function RequireFounder({ children }: { children: JSX.Element }): JSX.Element {
  return api.isFounderAuthed() ? children : <Navigate to="/founder" replace />
}

export default function App(): JSX.Element {
  return (
    <LanguageProvider>
      <ScrollManager />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Route>
        <Route path="/founder" element={<FounderLogin />} />
        <Route
          path="/founder/dashboard"
          element={
            <RequireFounder>
              <FounderDashboard />
            </RequireFounder>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LanguageProvider>
  )
}
