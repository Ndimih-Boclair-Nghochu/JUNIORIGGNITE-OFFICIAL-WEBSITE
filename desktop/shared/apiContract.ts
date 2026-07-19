import type {
  ApiResult,
  Session,
  School,
  SchoolClass,
  ActivityLogEntry,
  Language,
  DashboardSummary,
  Term,
  Student,
  StudentHistoryEntry,
  Teacher,
  Subject,
  ClassSubject,
  Subsystem,
  AttendanceStatus,
  StudentResult,
  ReportCardMeta,
  FeeStructure,
  FeePayment,
  FeeMethod,
  FeeType,
  ClassLevel,
  PromotionPreview,
  LicenseInfo,
  RegistrationInfo,
  ActivationResult,
  StartupNotices,
  UpdateInfo
} from './types'

// Type-only contract for window.api, shared between the preload bridge and
// the renderer so both sides fail to compile if they drift apart.
export interface JuniorIgniteApi {
  app: {
    getState: () => Promise<ApiResult<{ school: School | null }>>
    firstRunSetup: (payload: {
      name: string
      motto: string
      address: string
      phone: string
      email: string
      region: string
      division: string
      subdivision: string
      language: Language
      logoPath: string | null
      adminUsername: string
      adminPassword: string
    }) => Promise<ApiResult<{ classCodes: Record<string, string> }>>
    integrityStatus: () => Promise<ApiResult<{ ok: boolean }>>
    quit: () => Promise<ApiResult<null>>
    checkUpdate: () => Promise<ApiResult<UpdateInfo>>
    openExternal: (payload: { url: string }) => Promise<ApiResult<null>>
  }
  auth: {
    adminLogin: (payload: { username: string; password: string }) => Promise<ApiResult<Session>>
    unlockClass: (payload: { classId: number; code: string }) => Promise<ApiResult<Session>>
    logout: () => Promise<ApiResult<null>>
    currentSession: () => Promise<ApiResult<Session>>
    changeAdminPassword: (payload: { currentPassword: string; newPassword: string }) => Promise<ApiResult<null>>
  }
  landing: {
    listClasses: () => Promise<ApiResult<SchoolClass[]>>
  }
  files: {
    pickImage: () => Promise<ApiResult<{ path: string | null }>>
  }
  activityLog: {
    list: (payload?: { limit?: number }) => Promise<ApiResult<ActivityLogEntry[]>>
  }
  settings: {
    get: () => Promise<ApiResult<School | null>>
    update: (payload: Partial<School>) => Promise<ApiResult<School>>
  }
  dashboard: {
    summary: () => Promise<ApiResult<DashboardSummary>>
    activity: () => Promise<ApiResult<ActivityLogEntry[]>>
  }
  students: {
    list: (filters?: { classId?: number; search?: string }) => Promise<ApiResult<Student[]>>
    get: (payload: { id: number }) => Promise<ApiResult<Student>>
    create: (payload: Partial<Student>) => Promise<ApiResult<Student>>
    update: (payload: Partial<Student> & { id: number }) => Promise<ApiResult<Student>>
    delete: (payload: { id: number }) => Promise<ApiResult<null>>
    history: (payload: { studentId: number }) => Promise<ApiResult<StudentHistoryEntry[]>>
    promote: (payload: { studentId: number; toClassId: number; notes?: string }) => Promise<ApiResult<null>>
    transfer: (payload: { studentId: number; toClassId: number; notes?: string }) => Promise<ApiResult<null>>
    withdraw: (payload: { studentId: number; notes?: string }) => Promise<ApiResult<null>>
    graduate: (payload: { studentId: number; notes?: string }) => Promise<ApiResult<null>>
    markRepeating: (payload: { studentId: number; notes?: string }) => Promise<ApiResult<null>>
  }
  teachers: {
    list: () => Promise<ApiResult<Teacher[]>>
    get: (payload: { id: number }) => Promise<ApiResult<Teacher>>
    create: (payload: Partial<Teacher>) => Promise<ApiResult<Teacher>>
    update: (payload: Partial<Teacher> & { id: number }) => Promise<ApiResult<Teacher>>
    delete: (payload: { id: number }) => Promise<ApiResult<null>>
  }
  classes: {
    list: () => Promise<ApiResult<SchoolClass[]>>
    get: (payload: { id: number }) => Promise<ApiResult<SchoolClass & { subjects: ClassSubject[] }>>
    create: (payload: {
      name: string
      subsystem: Subsystem
      capacity: number
      classTeacherId: number | null
      levelId: number | null
    }) => Promise<ApiResult<{ schoolClass: SchoolClass; accessCode: string }>>
    update: (payload: {
      id: number
      name?: string
      subsystem?: Subsystem
      capacity?: number
      classTeacherId?: number | null
      levelId?: number | null
    }) => Promise<ApiResult<SchoolClass>>
    delete: (payload: { id: number }) => Promise<ApiResult<null>>
    regenerateCode: (payload: { id: number }) => Promise<ApiResult<{ accessCode: string }>>
    assignSubject: (payload: {
      classId: number
      subjectId: number
      teacherId: number | null
      coefficient: number
    }) => Promise<ApiResult<null>>
    unassignSubject: (payload: { classId: number; subjectId: number }) => Promise<ApiResult<null>>
  }
  subjects: {
    list: () => Promise<ApiResult<Subject[]>>
    create: (payload: {
      name: string
      nameFr?: string
      classId?: number
      coefficient?: number
    }) => Promise<ApiResult<Subject>>
    update: (payload: { id: number; name?: string; nameFr?: string }) => Promise<ApiResult<Subject>>
    delete: (payload: { id: number }) => Promise<ApiResult<null>>
  }
  attendance: {
    getForDate: (payload: {
      classId: number
      date: string
    }) => Promise<ApiResult<{ studentId: number; firstName: string; lastName: string; status: AttendanceStatus | null }[]>>
    mark: (payload: {
      studentId: number
      classId: number
      date: string
      status: AttendanceStatus
    }) => Promise<ApiResult<null>>
    summary: (payload?: {
      classId?: number
    }) => Promise<ApiResult<{ studentId: number; name: string; presentPct: number; totalDays: number }[]>>
  }
  marks: {
    getForClass: (payload: { classId: number; termId: number }) => Promise<ApiResult<StudentResult[]>>
    save: (payload: {
      studentId: number
      subjectId: number
      classId: number
      termId: number
      caMark: number | null
      examMark: number | null
    }) => Promise<ApiResult<null>>
    compute: (payload: { classId: number; termId: number }) => Promise<ApiResult<StudentResult[]>>
    publish: (payload: { classId: number; termId: number }) => Promise<ApiResult<null>>
  }
  terms: {
    list: () => Promise<ApiResult<Term[]>>
  }
  reportCardMeta: {
    get: (payload: { studentId: number; termId: number }) => Promise<ApiResult<ReportCardMeta | null>>
    save: (payload: {
      studentId: number
      termId: number
      conduct?: string
      teacherComment?: string
      headTeacherComment?: string
      promotionDecision?: 'promoted' | 'repeat' | 'pending'
    }) => Promise<ApiResult<null>>
  }
  reportCards: {
    generate: (payload: { studentId: number; termId: number }) => Promise<ApiResult<{ path: string }>>
    generateClass: (payload: { classId: number; termId: number }) => Promise<ApiResult<{ count: number; dir: string }>>
  }
  idCards: {
    generate: (payload: { studentId: number; format: 'paper' | 'pvc' }) => Promise<ApiResult<{ path: string }>>
  }
  studentProfiles: {
    generate: (payload: { studentId: number }) => Promise<ApiResult<{ path: string }>>
  }
  fees: {
    listStructures: (payload: { termId: number }) => Promise<ApiResult<FeeStructure[]>>
    saveStructure: (payload: {
      classId: number
      termId: number
      amount: number
      description?: string
    }) => Promise<ApiResult<null>>
    listPayments: (payload: {
      termId: number
      classId?: number
    }) => Promise<
      ApiResult<
        {
          studentId: number
          studentName: string
          admissionNo: string
          className: string
          expected: number
          paid: number
          balance: number
          payments: FeePayment[]
        }[]
      >
    >
    recordPayment: (payload: {
      studentId: number
      termId: number
      amount: number
      method: FeeMethod
      reference?: string
      feeTypeId?: number | null
    }) => Promise<ApiResult<{ paymentId: number }>>
    balance: (payload: {
      termId: number
    }) => Promise<ApiResult<{ totalExpected: number; totalCollected: number; totalOutstanding: number }>>
    generateReceipt: (payload: { paymentId: number }) => Promise<ApiResult<{ path: string }>>
  }
  feeTypes: {
    list: () => Promise<ApiResult<FeeType[]>>
    create: (payload: { name: string; amount: number }) => Promise<ApiResult<FeeType>>
    delete: (payload: { id: number }) => Promise<ApiResult<null>>
  }
  classLevels: {
    list: () => Promise<ApiResult<ClassLevel[]>>
    create: (payload: { name: string; orderIndex?: number }) => Promise<ApiResult<ClassLevel>>
    update: (payload: { id: number; name?: string; orderIndex?: number }) => Promise<ApiResult<ClassLevel>>
    delete: (payload: { id: number }) => Promise<ApiResult<null>>
  }
  promotion: {
    preview: (payload: {
      classId: number
      termId: number | null
      /** Overrides the school default for this run. */
      promotionAverage?: number
    }) => Promise<ApiResult<PromotionPreview>>
    run: (payload: {
      studentIds: number[]
      toClassId: number | null
      graduate?: boolean
      notes?: string
      /** Term whose report card is marked PROMOTED; defaults to the year's last term. */
      termId?: number | null
    }) => Promise<ApiResult<{ promoted: number }>>
  }
  license: {
    status: () => Promise<ApiResult<LicenseInfo>>
    activate: (payload: { code: string }) => Promise<ApiResult<ActivationResult>>
    registrationInfo: () => Promise<ApiResult<RegistrationInfo>>
    startupNotices: () => Promise<ApiResult<StartupNotices>>
    dismissUpdate: (payload: { kind: 'monthly' | 'annual' }) => Promise<ApiResult<null>>
  }
  backup: {
    create: () => Promise<ApiResult<{ path: string | null }>>
    list: () => Promise<ApiResult<{ path: string; name: string; size: number; createdAt: string }[]>>
    restore: () => Promise<ApiResult<{ restored: boolean }>>
  }
}
