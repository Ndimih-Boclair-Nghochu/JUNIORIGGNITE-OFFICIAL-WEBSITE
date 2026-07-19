// Shared entity + IPC payload types used by both the Electron main process and the renderer.
// Keep this file free of any Node-only or DOM-only imports so it can be shared verbatim.

export type Language = 'en' | 'fr'
export type Subsystem = 'anglophone' | 'francophone'
export type Gender = 'male' | 'female'
export type StudentStatus = 'active' | 'promoted' | 'transferred' | 'withdrawn' | 'graduated' | 'repeating'
export type AttendanceStatus = 'present' | 'absent' | 'sick' | 'late'
export type FeeMethod = 'momo' | 'orange' | 'other'
export type ActorType = 'admin' | 'teacher'
// A JuniorIgnite license is either valid (active) or past its end-of-February
// expiry (expired). There is no read-only grace state: on expiry the app hard-
// locks to the Activate + Support screens until a new signed code is applied.
export type LicenseStatus = 'active' | 'expired'

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
  poBox: string | null
  villageTown: string | null
  aboutText: string | null
  /** Printed under the PRINCIPAL signature line on report cards. */
  principalName: string | null
  /** Minimum average a pupil needs to be promoted automatically (default 10). */
  promotionAverage: number
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

/**
 * A class level ("Class One"). Levels are ordered and drive promotion: a pupil
 * moves from a class in one level to a class in the next-higher level. One
 * level can contain several class streams ("Class One A", "Class One B").
 */
export interface ClassLevel {
  id: number
  name: string
  orderIndex: number
  classCount: number
}

export interface SchoolClass {
  id: number
  /** The stream name, e.g. "Class One A". */
  name: string
  subsystem: Subsystem
  capacity: number
  classTeacherId: number | null
  classTeacherName: string | null
  studentCount: number
  hasAccessCode: boolean
  /** The level this class belongs to; drives promotion order. */
  levelId: number | null
  levelName: string | null
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

/** A category of fee the school collects, e.g. "Tuition", "Exam Fees", "PTA". */
export interface FeeType {
  id: number
  name: string
  /** What the school charges for this fee (FCFA); pre-fills the payment amount. */
  amount: number
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
  /** Which fee this payment was for; null for payments recorded before fee types existed. */
  feeTypeId: number | null
  feeTypeName: string | null
}

/** One pupil considered for promotion, with the average the decision is based on. */
export interface PromotionCandidate {
  studentId: number
  name: string
  admissionNo: string
  /** Average over the chosen basis (a single term, or the year's mean). Null when ungraded. */
  average: number | null
  /** True when average >= the school's promotion average. */
  eligible: boolean
}

/** Everything the promotion screen needs for one source class. */
export interface PromotionPreview {
  /** The average actually applied (the admin's entry, or the school default). */
  promotionAverage: number
  currentLevel: ClassLevel | null
  /** The level directly above, when one exists — offered as the suggested destination. */
  nextLevel: ClassLevel | null
  /** Every class in the school; the admin picks where eligible pupils go. */
  targetClasses: SchoolClass[]
  /** Suggested destination (a class in nextLevel), when one can be inferred. */
  suggestedClassId: number | null
  candidates: PromotionCandidate[]
}

export interface LicenseInfo {
  status: LicenseStatus
  issuedAt: string
  expiresAt: string
  daysRemaining: number
  /** Permanent School ID assigned at setup; half of the license binding. */
  schoolId: string
  /** Per-install Device ID; the other half of the binding (non-transferable). */
  deviceId: string
  /**
   * True while running on the auto-issued first-year provisional license (valid
   * until the next end-of-February). A signed ELIGNITE code clears this.
   */
  provisional: boolean
  /**
   * When active and inside a warning window, the threshold (in days) that fired
   * — one of LICENSE_WARNING_DAYS. Null when no warning should show.
   */
  warningThreshold: number | null
  /** Number of enrolled students the annual licence fee is charged on. */
  studentCount: number
  /** Total annual licence fee payable = studentCount × LICENSE_FEE_PER_STUDENT_XAF (XAF). */
  feeTotalXaf: number
}

/** Result of checking the JuniorIgnite website for a newer release. */
export interface UpdateInfo {
  /** True when the site advertises a version newer than the one installed. */
  updateAvailable: boolean
  currentVersion: string
  latestVersion: string | null
  /** Where to send the user to download it. */
  downloadPageUrl: string
  /** False when the site could not be reached (offline) — never treated as an error. */
  checked: boolean
}

/** School identity shown at setup so the school can obtain its first code. */
export interface RegistrationInfo {
  schoolId: string
  deviceId: string
  schoolName: string
}

/** Result of attempting to apply an activation code. */
export interface ActivationResult {
  license: LicenseInfo
}

/**
 * One-shot notices computed at launch: an escalating license warning plus the
 * monthly / annual "check for updates" nudges (each shown once per period).
 */
export interface StartupNotices {
  license: LicenseInfo
  showMonthlyUpdate: boolean
  showAnnualUpdate: boolean
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
