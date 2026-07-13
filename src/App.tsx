import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/appStore'
import { useAuthStore } from './store/authStore'
import { FullScreenSpinner } from './components/Spinner'
import SetupWizard from './screens/setup-wizard/SetupWizard'
import Landing from './screens/landing/Landing'
import AdminLayout from './screens/admin/AdminLayout'
import TeacherLayout from './screens/teacher/TeacherLayout'

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

  useEffect(() => {
    refresh()
    refreshSession()
  }, [])

  if (loading || sessionLoading) return <FullScreenSpinner />

  if (!school || !school.setupComplete) {
    return <SetupWizard />
  }

  return (
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
  )
}
