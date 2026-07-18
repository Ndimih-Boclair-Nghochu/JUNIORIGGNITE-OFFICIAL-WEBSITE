import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import type { LicenseInfo } from '@shared/types'
import { useAppStore } from './store/appStore'
import { useAuthStore } from './store/authStore'
import { FullScreenSpinner } from './components/Spinner'
import SetupWizard from './screens/setup-wizard/SetupWizard'
import WelcomeLanding from './screens/landing/WelcomeLanding'
import Landing from './screens/landing/Landing'
import AdminLayout from './screens/admin/AdminLayout'
import TeacherLayout from './screens/teacher/TeacherLayout'
import LicenseExpiredScreen from './screens/license/LicenseExpiredScreen'
import StartupNotices from './screens/license/StartupNotices'

function RequireAdmin({ children }: { children: JSX.Element }): JSX.Element {
  const session = useAuthStore((s) => s.session)
  if (!session || session.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function RequireTeacher({ children }: { children: JSX.Element }): JSX.Element {
  const session = useAuthStore((s) => s.session)
  if (!session || session.role !== 'teacher') return <Navigate to="/" replace />
  return children
}

export default function App(): JSX.Element {
  const { school, loading, refresh } = useAppStore()
  const refreshSession = useAuthStore((s) => s.refresh)
  const sessionLoading = useAuthStore((s) => s.loading)
  const session = useAuthStore((s) => s.session)
  const [entered, setEntered] = useState(false)
  const [license, setLicense] = useState<LicenseInfo | null>(null)
  const [licenseLoading, setLicenseLoading] = useState(true)

  const loadLicense = useCallback(async () => {
    const res = await window.api.license.status()
    setLicense(res.ok ? res.data ?? null : null)
    setLicenseLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    refreshSession()
    loadLicense()
  }, [loadLicense])

  if (loading || sessionLoading || licenseLoading) return <FullScreenSpinner />

  const setupComplete = !!school?.setupComplete

  // Hard lock: once a set-up install's license has expired, nothing is reachable
  // except Activate License / Contact Support / Exit. Data stays safe on disk;
  // a successful activation re-checks the license and restores full access.
  if (setupComplete && license?.status === 'expired') {
    return (
      <LicenseExpiredScreen
        onActivated={() => {
          loadLicense()
          refresh()
        }}
      />
    )
  }

  // JuniorIgnite welcome splash on every launch, before entering the account.
  // Skipped when a session is already active (e.g. after login).
  if (!entered && !session) {
    return <WelcomeLanding hasAccount={setupComplete} onEnter={() => setEntered(true)} />
  }

  if (!setupComplete) {
    return <SetupWizard />
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/admin/*"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        />
        <Route
          path="/teacher/*"
          element={
            <RequireTeacher>
              <TeacherLayout />
            </RequireTeacher>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Launch-time license warning + gentle update reminders (active license only). */}
      <StartupNotices />
    </>
  )
}
