import type { Session } from '@shared/types'

/**
 * Holds the single active session in memory, in the main process only.
 * This is the enforcement chokepoint: every IPC handler that touches
 * class-scoped or admin-only data must call requireAdmin()/requireTeacher()
 * (or requireTeacherForClass()) rather than trusting classId/role values
 * sent from the renderer.
 */
class SessionManager {
  private current: Session = null

  get(): Session {
    return this.current
  }

  setAdmin(adminId: number, username: string): void {
    this.current = { role: 'admin', adminId, username }
  }

  setTeacher(teacherId: number | null, classId: number, className: string): void {
    this.current = { role: 'teacher', teacherId, classId, className }
  }

  clear(): void {
    this.current = null
  }

  requireAdmin(): Extract<Session, { role: 'admin' }> {
    if (!this.current || this.current.role !== 'admin') {
      throw new Error('Admin session required')
    }
    return this.current
  }

  requireTeacher(): Extract<Session, { role: 'teacher' }> {
    if (!this.current || this.current.role !== 'teacher') {
      throw new Error('Teacher class session required')
    }
    return this.current
  }

  /** Throws unless the active session is an admin OR a teacher scoped to this exact class. */
  requireAdminOrClassScope(classId: number): void {
    if (!this.current) throw new Error('Authentication required')
    if (this.current.role === 'admin') return
    if (this.current.role === 'teacher' && this.current.classId === classId) return
    throw new Error('Not authorized for this class')
  }
}

export const sessionManager = new SessionManager()
