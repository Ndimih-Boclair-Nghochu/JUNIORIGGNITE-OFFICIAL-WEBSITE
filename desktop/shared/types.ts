// Shared entity + IPC payload types used by both the Electron main process and the renderer.
// Keep this file free of any Node-only or DOM-only imports so it can be shared verbatim.

export type Language = 'en' | 'fr'
export type Subsystem = 'anglophone' | 'francophone'
export type Gender = 'male' | 'female'
export type StudentStatus = 'active' | 'promoted' | 'transferred' | 'withdrawn' | 'graduated' | 'repeating'
export type AttendanceStatus = 'present' | 'absent' | 'sick' | 'late'
export type FeeMethod = 'momo' | 'orange' | 'other'
export type ActorType = 'admin' | 'teacher'
export type LicenseStatus = 'active' | 'grace' | 'expired'

export interface School {
  id: number
  name: string
  logoPath: string | null
  motto: string | null
  address: string | null
  phone: string | null
  email: string | null
  region: string | null
  division: string | null
  subdivision: string | null
  language: Language
  currentAcademicYearId: number | null
  currentTermId: number | null
  setupComplete: boolean
}

export interface AcademicYear {
  id: number
  label: string
  isCurrent: boolean
}

export interface Term {
  id: number
  academicYearId: number
  name: string
  cycle: 'first' | 'second'
  orderIndex: number
  isCurrent: boolean
}

export interface SchoolClass {
  id: number
  name: string
  subsystem: Subsystem
  capacity: number
  classTeacherId: number | null
  classTeacherName: string | null
  studentCount: number
  hasAccessCode: boolean
}

export interface Subject {
  id: number
  name: string
  nameFr: string | null
  assignedClasses: { classId: number; className: string; coefficient: number }[]
}

export interface ClassSubject {
  id: number
  classId: number
  subjectId: number
  subjectName: string
  teacherId: number | null
  teacherName: string | null
  coefficient: number
}

export interface Teacher {
  id: number
  photoPath: string | null
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  qualifications: string | null
  employmentDate: string | null
  status: 'active' | 'inactive'
  assignedClassNames: string[]
}

export interface Student {
  id: number
  admissionNo: string
  photoPath: string | null
  firstName: string
  lastName: string
  dob: string | null
  gender: Gender
  classId: number
  className: string | null
  parentName: string | null
  parentPhone: string | null
  parentEmail: string | null
  emergencyContact: string | null
  medicalNotes: string | null
  previousSchool: string | null
  status: StudentStatus
  enrollmentDate: string
}

export interface StudentHistoryEntry {
  id: number
  studentId: number
  eventType: 'promotion' | 'transfer' | 'withdrawal' | 'graduation' | 'repeat' | 'enrollment'
  fromClassId: number | null
  toClassId: number | null
  fromClassName: string | null
  toClassName: string | null
  notes: string | null
  createdAt: string
}

export interface AttendanceRecord {
  id: number
  studentId: number
  classId: number
  date: string
  status: AttendanceStatus
  recordedBy: string
  lastModifiedAt: string
}

export interface MarkRecord {
  id: number
  studentId: number
  subjectId: number
  classId: number
  termId: number
  caMark: number | null
  examMark: number | null
  published: boolean
  lastModifiedAt: string
}

export interface ReportCardMeta {
  studentId: number
  termId: number
  conduct: string | null
  teacherComment: string | null
  headTeacherComment: string | null
  promotionDecision: 'promoted' | 'repeat' | 'pending' | null
  publishedAt: string | null
}

export interface FeeStructure {
  id: number
  classId: number
  termId: number
  amount: number
  description: string | null
}

export interface FeePayment {
  id: number
  studentId: number
  termId: number
  amount: number
  method: FeeMethod
  reference: string | null
  paidAt: string
  recordedBy: string
  lastModifiedAt: string
}

export interface LicenseInfo {
  status: LicenseStatus
  issuedAt: string
  expiresAt: string
  daysRemaining: number
}

export interface ActivityLogEntry {
  id: number
  actorType: ActorType
  actorLabel: string
  action: string
  entityType: string | null
  entityId: number | null
  details: string | null
  createdAt: string
}

export interface SyncConflict {
  id: number
  entityType: string
  entityId: number
  localJson: string
  remoteJson: string
  resolved: boolean
  resolution: string | null
  createdAt: string
}

export interface SubjectResult {
  subjectId: number
  subjectName: string
  coefficient: number
  caMark: number | null
  examMark: number | null
  average: number | null
  position: number | null
  classSize: number
}

export interface StudentResult {
  studentId: number
  firstName: string
  lastName: string
  subjectResults: SubjectResult[]
  overallAverage: number | null
  overallRank: number | null
  grade: string
  remark: string
}

export interface DashboardSummary {
  totalStudents: number
  totalTeachers: number
  totalClasses: number
  boys: number
  girls: number
  attendanceTodayPresentPct: number | null
  feesCollected: number
  feesOutstanding: number
  licenseStatus: LicenseStatus
  licenseDaysRemaining: number
}

// --- Session ---

export type Session =
  | { role: 'admin'; adminId: number; username: string }
  | { role: 'teacher'; teacherId: number | null; classId: number; className: string }
  | null

export interface ApiResult<T> {
  ok: boolean
  data?: T
  error?: string
}
