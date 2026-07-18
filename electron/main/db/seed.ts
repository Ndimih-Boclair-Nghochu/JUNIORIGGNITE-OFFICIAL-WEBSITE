import type Database from 'better-sqlite3-multiple-ciphers'
import { hashSecret, generateAccessCode } from '../services/auth'
import { getDeviceId } from './connection'

/**
 * Populates realistic demo data (classes in both subsystems, teachers,
 * students, marks, one fee payment) so the app is immediately explorable
 * right after first-run setup. Idempotent: no-ops if classes already exist.
 * Returns the plaintext class access codes so the setup screen can show them
 * to the admin once (only the bcrypt hash is persisted).
 */
export async function seedDemoData(db: Database.Database): Promise<{ classCodes: Record<string, string> }> {
  const existing = db.prepare('SELECT COUNT(*) as c FROM classes').get() as { c: number }
  if (existing.c > 0) return { classCodes: {} }

  const deviceId = getDeviceId()
  const classCodes: Record<string, string> = {}

  const insertYear = db.prepare(`INSERT INTO academic_years (label, is_current) VALUES (?, 1)`)
  const yearId = insertYear.run('2025/2026').lastInsertRowid as number

  const insertTerm = db.prepare(
    `INSERT INTO terms (academic_year_id, name, cycle, order_index, is_current) VALUES (?, ?, ?, ?, ?)`
  )
  const term1Id = insertTerm.run(yearId, 'First Term', 'first', 1, 1).lastInsertRowid as number
  insertTerm.run(yearId, 'Second Term', 'first', 2, 0)
  insertTerm.run(yearId, 'Third Term', 'second', 3, 0)

  db.prepare(`UPDATE schools SET current_academic_year_id = ?, current_term_id = ? WHERE id = 1`).run(
    yearId,
    term1Id
  )

  const insertSubject = db.prepare(`INSERT INTO subjects (name, name_fr) VALUES (?, ?)`)
  const subjects = {
    english: insertSubject.run('English Language', 'Anglais').lastInsertRowid as number,
    french: insertSubject.run('French', 'Français').lastInsertRowid as number,
    maths: insertSubject.run('Mathematics', 'Mathématiques').lastInsertRowid as number,
    science: insertSubject.run('Science', 'Sciences').lastInsertRowid as number
  }

  const insertTeacher = db.prepare(
    `INSERT INTO teachers (first_name, last_name, phone, email, qualifications, employment_date, status, device_id)
     VALUES (@firstName, @lastName, @phone, @email, @qualifications, @employmentDate, 'active', @deviceId)`
  )
  const teacherAId = insertTeacher.run({
    firstName: 'Grace',
    lastName: 'Mbeki',
    phone: '677112233',
    email: 'grace.mbeki@example.com',
    qualifications: 'Grade One Teacher Certificate',
    employmentDate: '2019-09-01',
    deviceId
  }).lastInsertRowid as number
  const teacherBId = insertTeacher.run({
    firstName: 'Jean',
    lastName: 'Ateba',
    phone: '699223344',
    email: 'jean.ateba@example.com',
    qualifications: 'CAPIEMP',
    employmentDate: '2021-01-15',
    deviceId
  }).lastInsertRowid as number

  // Class levels form the promotion ladder; each demo class sits on its own level
  // and a level can later hold several streams (Class 5 A, Class 5 B, …).
  const insertLevel = db.prepare(`INSERT INTO class_levels (name, order_index) VALUES (?, ?)`)
  const levelAId = insertLevel.run('Class 5', 1).lastInsertRowid as number
  const levelBId = insertLevel.run('CM2', 2).lastInsertRowid as number

  const insertClass = db.prepare(
    `INSERT INTO classes (name, subsystem, capacity, access_code_hash, class_teacher_id, level_id)
     VALUES (@name, @subsystem, @capacity, @codeHash, @teacherId, @levelId)`
  )

  const codeA = generateAccessCode()
  classCodes['Class 5'] = codeA
  const classAId = insertClass.run({
    name: 'Class 5',
    subsystem: 'anglophone',
    capacity: 40,
    codeHash: await hashSecret(codeA),
    teacherId: teacherAId,
    levelId: levelAId
  }).lastInsertRowid as number

  const codeB = generateAccessCode()
  classCodes['CM2'] = codeB
  const classBId = insertClass.run({
    name: 'CM2',
    subsystem: 'francophone',
    capacity: 40,
    codeHash: await hashSecret(codeB),
    teacherId: teacherBId,
    levelId: levelBId
  }).lastInsertRowid as number

  const insertClassSubject = db.prepare(
    `INSERT INTO class_subjects (class_id, subject_id, teacher_id, coefficient) VALUES (?, ?, ?, ?)`
  )
  for (const classId of [classAId, classBId]) {
    const teacherId = classId === classAId ? teacherAId : teacherBId
    insertClassSubject.run(classId, subjects.english, teacherId, 2)
    insertClassSubject.run(classId, subjects.french, teacherId, 2)
    insertClassSubject.run(classId, subjects.maths, teacherId, 3)
    insertClassSubject.run(classId, subjects.science, teacherId, 2)
  }

  const insertStudent = db.prepare(
    `INSERT INTO students (admission_no, first_name, last_name, dob, gender, class_id, parent_name, parent_phone, emergency_contact, status, enrollment_date, device_id)
     VALUES (@admissionNo, @firstName, @lastName, @dob, @gender, @classId, @parentName, @parentPhone, @emergencyContact, 'active', @enrollmentDate, @deviceId)`
  )

  const demoStudents = [
    { classId: classAId, admissionNo: 'JI-2025-001', firstName: 'Divine', lastName: 'Fon', dob: '2015-03-12', gender: 'male', parentName: 'Mr. Fon Peter', parentPhone: '677001122' },
    { classId: classAId, admissionNo: 'JI-2025-002', firstName: 'Precious', lastName: 'Nkemayang', dob: '2015-06-02', gender: 'female', parentName: 'Mrs. Nkemayang Ruth', parentPhone: '677003344' },
    { classId: classAId, admissionNo: 'JI-2025-003', firstName: 'Emmanuel', lastName: 'Tabi', dob: '2015-01-20', gender: 'male', parentName: 'Mr. Tabi George', parentPhone: '677005566' },
    { classId: classBId, admissionNo: 'JI-2025-004', firstName: 'Aicha', lastName: 'Bello', dob: '2015-09-08', gender: 'female', parentName: 'Mme Bello Fatou', parentPhone: '699007788' },
    { classId: classBId, admissionNo: 'JI-2025-005', firstName: 'Junior', lastName: 'Mvondo', dob: '2015-04-17', gender: 'male', parentName: 'M. Mvondo Paul', parentPhone: '699009900' }
  ] as const

  const studentIds: number[] = []
  for (const s of demoStudents) {
    const id = insertStudent.run({
      admissionNo: s.admissionNo,
      firstName: s.firstName,
      lastName: s.lastName,
      dob: s.dob,
      gender: s.gender,
      classId: s.classId,
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      emergencyContact: s.parentPhone,
      enrollmentDate: '2025-09-02',
      deviceId
    }).lastInsertRowid as number
    studentIds.push(id)
    db.prepare(
      `INSERT INTO student_history (student_id, event_type, to_class_id, notes) VALUES (?, 'enrollment', ?, 'Initial enrollment (demo data)')`
    ).run(id, s.classId)
  }

  const insertMark = db.prepare(
    `INSERT INTO marks (student_id, subject_id, class_id, term_id, ca_mark, exam_mark, published, device_id)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
  )
  let seedRand = 42
  const pseudoRandom = () => {
    seedRand = (seedRand * 9301 + 49297) % 233280
    return seedRand / 233280
  }
  for (const studentId of studentIds) {
    const student = db.prepare('SELECT class_id FROM students WHERE id = ?').get(studentId) as { class_id: number }
    for (const subjectId of Object.values(subjects)) {
      // Both marks are on a 0-20 scale (matches the marks-entry UI and grade bands).
      const ca = Math.round(8 + pseudoRandom() * 12) // 8-20
      const exam = Math.round(6 + pseudoRandom() * 13) // 6-19
      insertMark.run(studentId, subjectId, student.class_id, term1Id, ca, exam, deviceId)
    }
  }

  const insertFeeStructure = db.prepare(
    `INSERT INTO fee_structures (class_id, term_id, amount, description) VALUES (?, ?, ?, ?)`
  )
  insertFeeStructure.run(classAId, term1Id, 25000, 'First Term school fees')
  insertFeeStructure.run(classBId, term1Id, 25000, 'Frais de scolarité - Premier trimestre')

  db.prepare(
    `INSERT INTO fee_payments (student_id, term_id, amount, method, reference, recorded_by, device_id)
     VALUES (?, ?, ?, 'momo', ?, 'System (demo)', ?)`
  ).run(studentIds[0], term1Id, 15000, 'MOMO-DEMO-0001', deviceId)

  return { classCodes }
}
