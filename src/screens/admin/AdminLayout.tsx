import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School2,
  BookOpen,
  ClipboardCheck,
  NotebookPen,
  FileBadge,
  IdCard,
  Camera,
  Wallet,
  ShieldCheck,
  DatabaseBackup,
  GitCompareArrows,
  History,
  Settings as SettingsIcon,
  LogOut,
  ShieldAlert
} from 'lucide-react'
import type { LicenseInfo } from '@shared/types'
import { Sidebar } from '../../components/Sidebar'
import { Logo } from '../../components/Logo'
import { useAuthStore } from '../../store/authStore'
import { useAppStore } from '../../store/appStore'
import Dashboard from './dashboard/Dashboard'
import StudentsPage from './students/StudentsPage'
import TeachersPage from './teachers/TeachersPage'
import ClassesPage from './classes/ClassesPage'
import SubjectsPage from './subjects/SubjectsPage'
import StudentPhotosPage from './photos/StudentPhotosPage'
import AdminAttendancePage from './attendance/AdminAttendancePage'
import AdminMarksPage from './marks/AdminMarksPage'
import ReportCardsPage from './reportcards/ReportCardsPage'
import IdCardsPage from './idcards/IdCardsPage'
import FeesPage from './fees/FeesPage'
import LicensePage from './license/LicensePage'
import BackupPage from './backup/BackupPage'
import SyncIssuesPage from './sync/SyncIssuesPage'
import ActivityLogPage from './activity/ActivityLogPage'
import SettingsPage from './settings/SettingsPage'

export default function AdminLayout(): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const school = useAppStore((s) => s.school)
  const [license, setLicense] = useState<LicenseInfo | null>(null)

  useEffect(() => {
    window.api.license.status().then((res) => {
      if (res.ok) setLicense(res.data ?? null)
    })
  }, [])

  const items = [
    { to: '/admin/dashboard', label: t('common.dashboard'), icon: LayoutDashboard },
    { to: '/admin/students', label: t('common.students'), icon: Users },
    { to: '/admin/photos', label: 'Student Photos', icon: Camera },
    { to: '/admin/teachers', label: t('common.teachers'), icon: GraduationCap },
    { to: '/admin/classes', label: t('common.classes'), icon: School2 },
    { to: '/admin/subjects', label: t('common.subjects'), icon: BookOpen },
    { to: '/admin/attendance', label: 'Attendance', icon: ClipboardCheck },
    { to: '/admin/marks', label: 'Marks', icon: NotebookPen },
    { to: '/admin/report-cards', label: 'Report Cards', icon: FileBadge },
    { to: '/admin/id-cards', label: 'ID Cards', icon: IdCard },
    { to: '/admin/fees', label: 'Fees', icon: Wallet },
    { to: '/admin/license', label: 'License', icon: ShieldCheck },
    { to: '/admin/backup', label: 'Backup', icon: DatabaseBackup },
    { to: '/admin/sync-issues', label: 'Sync Issues', icon: GitCompareArrows },
    { to: '/admin/activity-log', label: 'Activity Log', icon: History },
    { to: '/admin/settings', label: t('common.settings'), icon: SettingsIcon }
  ]

  async function handleLogout(): Promise<void> {
    await logout()
    navigate('/')
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        items={items}
        header={
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <Logo className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <div className="truncate text-base font-bold text-slate-900">{school?.name ?? 'JuniorIgnite'}</div>
              <div className="text-xs text-slate-400">Administrator</div>
            </div>
          </div>
        }
        footer={
          <div className="border-t border-slate-100 p-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              <LogOut className="h-4.5 w-4.5" />
              {t('common.logout')}
            </button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">
        {license && license.status !== 'active' && (
          <div className="flex items-center gap-2 bg-amber-500 px-6 py-2 text-sm font-medium text-white">
            <ShieldAlert className="h-4 w-4" />
            License {license.status === 'grace' ? 'expired — read-only grace mode' : 'expired'}. Existing data is viewable/exportable; renew to create new records.
          </div>
        )}
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="photos" element={<StudentPhotosPage />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="attendance" element={<AdminAttendancePage />} />
          <Route path="marks" element={<AdminMarksPage />} />
          <Route path="report-cards" element={<ReportCardsPage />} />
          <Route path="id-cards" element={<IdCardsPage />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="license" element={<LicensePage />} />
          <Route path="backup" element={<BackupPage />} />
          <Route path="sync-issues" element={<SyncIssuesPage />} />
          <Route path="activity-log" element={<ActivityLogPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </div>
    </div>
  )
}
