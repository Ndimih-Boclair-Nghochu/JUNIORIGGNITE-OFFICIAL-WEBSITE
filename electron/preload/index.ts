import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { JuniorIgniteApi } from '@shared/apiContract'

// Thin invoke wrapper — every channel is a plain request/response over IPC.
// This is the ONLY surface the renderer can reach; there is no direct DB or
// filesystem access, and no ipcRenderer.on() channels are exposed since the
// app has no push-style events yet.
const invoke = (channel: string, payload?: unknown) => ipcRenderer.invoke(channel, payload)

const api = {
  app: {
    getState: () => invoke(IPC.APP_GET_STATE),
    firstRunSetup: (payload: unknown) => invoke(IPC.APP_FIRST_RUN_SETUP, payload),
    integrityStatus: () => invoke(IPC.APP_INTEGRITY_STATUS)
  },
  auth: {
    adminLogin: (payload: { username: string; password: string }) => invoke(IPC.AUTH_ADMIN_LOGIN, payload),
    unlockClass: (payload: { classId: number; code: string }) => invoke(IPC.AUTH_UNLOCK_CLASS, payload),
    logout: () => invoke(IPC.AUTH_LOGOUT),
    currentSession: () => invoke(IPC.AUTH_CURRENT_SESSION),
    changeAdminPassword: (payload: { currentPassword: string; newPassword: string }) =>
      invoke(IPC.AUTH_CHANGE_ADMIN_PASSWORD, payload)
  },
  landing: {
    listClasses: () => invoke(IPC.LANDING_LIST_CLASSES)
  },
  files: {
    pickImage: () => invoke(IPC.FILE_PICK_IMAGE)
  },
  activityLog: {
    list: (payload?: { limit?: number }) => invoke(IPC.ACTIVITY_LOG_LIST, payload)
  },
  settings: {
    get: () => invoke(IPC.SETTINGS_GET),
    update: (payload: unknown) => invoke(IPC.SETTINGS_UPDATE, payload)
  },
  dashboard: {
    summary: () => invoke(IPC.DASHBOARD_SUMMARY),
    activity: () => invoke(IPC.DASHBOARD_ACTIVITY)
  },
  students: {
    list: (filters?: unknown) => invoke(IPC.STUDENTS_LIST, filters),
    get: (payload: unknown) => invoke(IPC.STUDENTS_GET, payload),
    create: (payload: unknown) => invoke(IPC.STUDENTS_CREATE, payload),
    update: (payload: unknown) => invoke(IPC.STUDENTS_UPDATE, payload),
    delete: (payload: unknown) => invoke(IPC.STUDENTS_DELETE, payload),
    history: (payload: unknown) => invoke(IPC.STUDENTS_HISTORY, payload),
    promote: (payload: unknown) => invoke(IPC.STUDENTS_PROMOTE, payload),
    transfer: (payload: unknown) => invoke(IPC.STUDENTS_TRANSFER, payload),
    withdraw: (payload: unknown) => invoke(IPC.STUDENTS_WITHDRAW, payload),
    graduate: (payload: unknown) => invoke(IPC.STUDENTS_GRADUATE, payload),
    markRepeating: (payload: unknown) => invoke(IPC.STUDENTS_MARK_REPEATING, payload)
  },
  teachers: {
    list: () => invoke(IPC.TEACHERS_LIST),
    get: (payload: unknown) => invoke(IPC.TEACHERS_GET, payload),
    create: (payload: unknown) => invoke(IPC.TEACHERS_CREATE, payload),
    update: (payload: unknown) => invoke(IPC.TEACHERS_UPDATE, payload),
    delete: (payload: unknown) => invoke(IPC.TEACHERS_DELETE, payload)
  },
  classes: {
    list: () => invoke(IPC.CLASSES_LIST),
    get: (payload: unknown) => invoke(IPC.CLASSES_GET, payload),
    create: (payload: unknown) => invoke(IPC.CLASSES_CREATE, payload),
    update: (payload: unknown) => invoke(IPC.CLASSES_UPDATE, payload),
    delete: (payload: unknown) => invoke(IPC.CLASSES_DELETE, payload),
    regenerateCode: (payload: unknown) => invoke(IPC.CLASSES_REGENERATE_CODE, payload),
    assignSubject: (payload: unknown) => invoke(IPC.CLASSES_ASSIGN_SUBJECT, payload),
    unassignSubject: (payload: unknown) => invoke(IPC.CLASSES_UNASSIGN_SUBJECT, payload)
  },
  subjects: {
    list: () => invoke(IPC.SUBJECTS_LIST),
    create: (payload: unknown) => invoke(IPC.SUBJECTS_CREATE, payload),
    update: (payload: unknown) => invoke(IPC.SUBJECTS_UPDATE, payload),
    delete: (payload: unknown) => invoke(IPC.SUBJECTS_DELETE, payload)
  },
  attendance: {
    getForDate: (payload: unknown) => invoke(IPC.ATTENDANCE_GET_FOR_DATE, payload),
    mark: (payload: unknown) => invoke(IPC.ATTENDANCE_MARK, payload),
    summary: (payload?: unknown) => invoke(IPC.ATTENDANCE_SUMMARY, payload)
  },
  marks: {
    getForClass: (payload: unknown) => invoke(IPC.MARKS_GET_FOR_CLASS, payload),
    save: (payload: unknown) => invoke(IPC.MARKS_SAVE, payload),
    compute: (payload: unknown) => invoke(IPC.MARKS_COMPUTE, payload),
    publish: (payload: unknown) => invoke(IPC.MARKS_PUBLISH, payload)
  },
  terms: {
    list: () => invoke(IPC.TERMS_LIST)
  },
  reportCardMeta: {
    get: (payload: unknown) => invoke(IPC.REPORT_CARD_META_GET, payload),
    save: (payload: unknown) => invoke(IPC.REPORT_CARD_META_SAVE, payload)
  },
  reportCards: {
    generate: (payload: unknown) => invoke(IPC.REPORT_CARD_GENERATE, payload)
  },
  idCards: {
    generate: (payload: unknown) => invoke(IPC.ID_CARD_GENERATE, payload)
  },
  studentProfiles: {
    generate: (payload: unknown) => invoke(IPC.STUDENT_PROFILE_GENERATE, payload)
  },
  fees: {
    listStructures: (payload: unknown) => invoke(IPC.FEES_LIST_STRUCTURES, payload),
    saveStructure: (payload: unknown) => invoke(IPC.FEES_SAVE_STRUCTURE, payload),
    listPayments: (payload: unknown) => invoke(IPC.FEES_LIST_PAYMENTS, payload),
    recordPayment: (payload: unknown) => invoke(IPC.FEES_RECORD_PAYMENT, payload),
    balance: (payload: unknown) => invoke(IPC.FEES_BALANCE, payload),
    generateReceipt: (payload: unknown) => invoke(IPC.FEES_GENERATE_RECEIPT, payload)
  },
  license: {
    status: () => invoke(IPC.LICENSE_STATUS),
    renew: () => invoke(IPC.LICENSE_RENEW)
  },
  backup: {
    create: () => invoke(IPC.BACKUP_CREATE),
    list: () => invoke(IPC.BACKUP_LIST),
    restore: () => invoke(IPC.BACKUP_RESTORE)
  },
  sync: {
    run: () => invoke(IPC.SYNC_RUN),
    listConflicts: () => invoke(IPC.SYNC_LIST_CONFLICTS),
    resolveConflict: (payload: unknown) => invoke(IPC.SYNC_RESOLVE_CONFLICT, payload),
    simulateConflict: () => invoke(IPC.SYNC_SIMULATE_CONFLICT)
  }
} satisfies JuniorIgniteApi

contextBridge.exposeInMainWorld('api', api)
