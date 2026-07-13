import { useAuthStore } from '../../../store/authStore'
import { AttendanceBoard } from '../../shared/AttendanceBoard'

export default function TeacherAttendancePage(): JSX.Element {
  const session = useAuthStore((s) => s.session)
  if (session?.role !== 'teacher') return <></>

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Attendance — {session.className}</h1>
      <AttendanceBoard classId={session.classId} />
    </div>
  )
}
