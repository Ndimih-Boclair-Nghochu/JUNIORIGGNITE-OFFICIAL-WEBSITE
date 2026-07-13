import { registerAppHandlers } from './app'
import { registerAuthHandlers } from './auth'
import { registerLandingHandlers } from './landing'
import { registerFileHandlers } from './files'
import { registerActivityLogHandlers } from './activityLog'
import { registerSettingsHandlers } from './settings'
import { registerDashboardHandlers } from './dashboard'
import { registerStudentHandlers } from './students'
import { registerTeacherHandlers } from './teachers'
import { registerClassHandlers } from './classes'
import { registerSubjectHandlers } from './subjects'
import { registerAttendanceHandlers } from './attendance'
import { registerMarksHandlers } from './marks'
import { registerTermHandlers } from './terms'
import { registerReportCardHandlers } from './reportCards'
import { registerFeeHandlers } from './fees'
import { registerLicenseHandlers } from './license'
import { registerBackupHandlers } from './backup'
import { registerSyncHandlers } from './sync'

/**
 * Central registration point. Each stage adds its own register*Handlers()
 * module here rather than editing existing ones, so handler files stay
 * small and independently reviewable.
 */
export function registerAllIpcHandlers(): void {
  registerAppHandlers()
  registerAuthHandlers()
  registerLandingHandlers()
  registerFileHandlers()
  registerActivityLogHandlers()
  registerSettingsHandlers()
  registerDashboardHandlers()
  registerStudentHandlers()
  registerTeacherHandlers()
  registerClassHandlers()
  registerSubjectHandlers()
  registerAttendanceHandlers()
  registerMarksHandlers()
  registerTermHandlers()
  registerReportCardHandlers()
  registerFeeHandlers()
  registerLicenseHandlers()
  registerBackupHandlers()
  registerSyncHandlers()
}
