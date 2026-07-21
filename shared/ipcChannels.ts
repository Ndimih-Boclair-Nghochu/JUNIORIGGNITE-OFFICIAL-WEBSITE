// Central registry of IPC channel names. Both electron/preload and electron/main/ipc
// import from here so a typo becomes a compile error instead of a silent no-op.

export const IPC = {
  // App / setup
  APP_GET_STATE: 'app:getState',
  APP_FIRST_RUN_SETUP: 'app:firstRunSetup',
  APP_INTEGRITY_STATUS: 'app:integrityStatus',
  APP_QUIT: 'app:quit',
  APP_CHECK_UPDATE: 'app:checkUpdate',
  APP_OPEN_EXTERNAL: 'app:openExternal',

  // Auth / session
  AUTH_ADMIN_LOGIN: 'auth:adminLogin',
  AUTH_UNLOCK_CLASS: 'auth:unlockClass',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_CURRENT_SESSION: 'auth:currentSession',
  AUTH_CHANGE_ADMIN_PASSWORD: 'auth:changeAdminPassword',
  AUTH_RECOVERY_QUESTION: 'auth:recoveryQuestion',
  AUTH_RESET_PASSWORD: 'auth:resetPassword',
  AUTH_SET_SECURITY_QUESTION: 'auth:setSecurityQuestion',

  // Landing
  LANDING_LIST_CLASSES: 'landing:listClasses',

  // Dashboard
  DASHBOARD_SUMMARY: 'dashboard:summary',
  DASHBOARD_ACTIVITY: 'dashboard:activity',

  // Students
  STUDENTS_LIST: 'students:list',
  STUDENTS_GET: 'students:get',
  STUDENTS_CREATE: 'students:create',
  STUDENTS_UPDATE: 'students:update',
  STUDENTS_DELETE: 'students:delete',
  STUDENTS_HISTORY: 'students:history',
  STUDENTS_PROMOTE: 'students:promote',
  STUDENTS_TRANSFER: 'students:transfer',
  STUDENTS_WITHDRAW: 'students:withdraw',
  STUDENTS_GRADUATE: 'students:graduate',
  STUDENTS_MARK_REPEATING: 'students:markRepeating',

  // Teachers
  TEACHERS_LIST: 'teachers:list',
  TEACHERS_GET: 'teachers:get',
  TEACHERS_CREATE: 'teachers:create',
  TEACHERS_UPDATE: 'teachers:update',
  TEACHERS_DELETE: 'teachers:delete',

  // Classes / subjects
  CLASSES_LIST: 'classes:list',
  CLASSES_GET: 'classes:get',
  CLASSES_CREATE: 'classes:create',
  CLASSES_UPDATE: 'classes:update',
  CLASSES_DELETE: 'classes:delete',
  CLASSES_REGENERATE_CODE: 'classes:regenerateCode',
  CLASSES_ASSIGN_SUBJECT: 'classes:assignSubject',
  CLASSES_UNASSIGN_SUBJECT: 'classes:unassignSubject',
  SUBJECTS_LIST: 'subjects:list',
  SUBJECTS_CREATE: 'subjects:create',
  SUBJECTS_UPDATE: 'subjects:update',
  SUBJECTS_DELETE: 'subjects:delete',
  TERMS_LIST: 'terms:list',

  // Attendance
  ATTENDANCE_GET_FOR_DATE: 'attendance:getForDate',
  ATTENDANCE_MARK: 'attendance:mark',
  ATTENDANCE_SUMMARY: 'attendance:summary',

  // Marks / report cards
  MARKS_GET_FOR_CLASS: 'marks:getForClass',
  MARKS_SAVE: 'marks:save',
  MARKS_COMPUTE: 'marks:compute',
  MARKS_PUBLISH: 'marks:publish',
  REPORT_CARD_META_GET: 'reportCard:metaGet',
  REPORT_CARD_META_SAVE: 'reportCard:metaSave',
  REPORT_CARD_GENERATE: 'reportCard:generate',
  REPORT_CARD_GENERATE_CLASS: 'reportCard:generateClass',

  // ID cards
  ID_CARD_GENERATE: 'idCard:generate',

  // Student profile (report-card cover)
  STUDENT_PROFILE_GENERATE: 'studentProfile:generate',

  // Fees
  FEES_LIST_STRUCTURES: 'fees:listStructures',
  FEES_SAVE_STRUCTURE: 'fees:saveStructure',
  FEES_LIST_PAYMENTS: 'fees:listPayments',
  FEES_RECORD_PAYMENT: 'fees:recordPayment',
  FEES_BALANCE: 'fees:balance',
  FEES_GENERATE_RECEIPT: 'fees:generateReceipt',
  FEE_TYPES_LIST: 'feeTypes:list',
  FEE_TYPES_CREATE: 'feeTypes:create',
  FEE_TYPES_DELETE: 'feeTypes:delete',

  // Class levels (promotion ladder)
  CLASS_LEVELS_LIST: 'classLevels:list',
  CLASS_LEVELS_CREATE: 'classLevels:create',
  CLASS_LEVELS_UPDATE: 'classLevels:update',
  CLASS_LEVELS_DELETE: 'classLevels:delete',

  // Promotion
  PROMOTION_PREVIEW: 'promotion:preview',
  PROMOTION_RUN: 'promotion:run',

  // License
  LICENSE_STATUS: 'license:status',
  LICENSE_ACTIVATE: 'license:activate',
  LICENSE_REGISTRATION_INFO: 'license:registrationInfo',
  LICENSE_STARTUP_NOTICES: 'license:startupNotices',
  LICENSE_DISMISS_UPDATE: 'license:dismissUpdate',

  // Backup
  BACKUP_CREATE: 'backup:create',
  BACKUP_LIST: 'backup:list',
  BACKUP_RESTORE: 'backup:restore',

  // Settings / activity log
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  ACTIVITY_LOG_LIST: 'activityLog:list',

  // Files
  FILE_PICK_IMAGE: 'file:pickImage'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
