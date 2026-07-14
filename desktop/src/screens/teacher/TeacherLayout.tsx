import { Routes, Route, useNavigate } from 'react-router-dom'
import { ClipboardCheck, NotebookPen, Users, FileBadge, LogOut, School2 } from 'lucide-react'
import { Sidebar } from '../../components/Sidebar'
import { SchoolBadge } from '../../components/SchoolBadge'
import { useAuthStore } from '../../store/authStore'
import { useAppStore } from '../../store/appStore'
import TeacherHome from './home/TeacherHome'
import TeacherAttendancePage from './attendance/TeacherAttendancePage'
import TeacherMarksPage from './marks/TeacherMarksPage'
import TeacherStudentsPage from './students/TeacherStudentsPage'
import TeacherReportPage from './report/TeacherReportPage'

export default function TeacherLayout(): JSX.Element {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const logout = useAuthStore((s) => s.logout)
  const school = useAppStore((s) => s.school)
  const className = session?.role === 'teacher' ? session.className : ''

  const items = [
    { to: '/teacher/class-home', label: 'Class Home', icon: School2 },
    { to: '/teacher/attendance', label: 'Attendance', icon: ClipboardCheck },
    { to: '/teacher/marks', label: 'Marks', icon: NotebookPen },
    { to: '/teacher/students', label: 'Students', icon: Users },
    { to: '/teacher/report-preview', label: 'Report Cards', icon: FileBadge }
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
            <SchoolBadge school={school} className="h-9 w-9 shrink-0 text-sm" />
            <div className="min-w-0">
              <div className="truncate text-base font-bold text-slate-900">{className}</div>
              <div className="truncate text-xs text-slate-400">{school?.name ?? 'Teacher access'}</div>
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
              Log out
            </button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="class-home" element={<TeacherHome />} />
          <Route path="attendance" element={<TeacherAttendancePage />} />
          <Route path="marks" element={<TeacherMarksPage />} />
          <Route path="students" element={<TeacherStudentsPage />} />
          <Route path="report-preview" element={<TeacherReportPage />} />
          <Route path="*" element={<TeacherHome />} />
        </Routes>
      </div>
    </div>
  )
}
