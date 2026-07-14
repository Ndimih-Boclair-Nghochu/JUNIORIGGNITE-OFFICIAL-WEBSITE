-- JuniorIgnite initial schema
-- Conventions: all timestamps are ISO-8601 strings (UTC). Money amounts are integers (FCFA, no decimals).

CREATE TABLE IF NOT EXISTS schools (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  logo_path TEXT,
  motto TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  region TEXT,
  division TEXT,
  subdivision TEXT,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','fr')),
  current_academic_year_id INTEGER,
  current_term_id INTEGER,
  setup_complete INTEGER NOT NULL DEFAULT 0,
  device_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS academic_years (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL UNIQUE,
  is_current INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cycle TEXT NOT NULL DEFAULT 'first' CHECK (cycle IN ('first','second')),
  order_index INTEGER NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_path TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  qualifications TEXT,
  employment_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_modified_at TEXT NOT NULL DEFAULT (datetime('now')),
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  subsystem TEXT NOT NULL DEFAULT 'anglophone' CHECK (subsystem IN ('anglophone','francophone')),
  capacity INTEGER NOT NULL DEFAULT 40,
  access_code_hash TEXT NOT NULL,
  class_teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_fr TEXT
);

CREATE TABLE IF NOT EXISTS class_subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  coefficient REAL NOT NULL DEFAULT 1,
  UNIQUE(class_id, subject_id)
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admission_no TEXT NOT NULL UNIQUE,
  photo_path TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob TEXT,
  gender TEXT NOT NULL CHECK (gender IN ('male','female')),
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  emergency_contact TEXT,
  medical_notes TEXT,
  previous_school TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','promoted','transferred','withdrawn','graduated','repeating')),
  enrollment_date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_modified_at TEXT NOT NULL DEFAULT (datetime('now')),
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS student_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('promotion','transfer','withdrawal','graduation','repeat','enrollment')),
  from_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  to_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent','sick','late')),
  recorded_by TEXT NOT NULL,
  last_modified_at TEXT NOT NULL DEFAULT (datetime('now')),
  device_id TEXT,
  UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS marks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  ca_mark REAL,
  exam_mark REAL,
  published INTEGER NOT NULL DEFAULT 0,
  last_modified_at TEXT NOT NULL DEFAULT (datetime('now')),
  device_id TEXT,
  UNIQUE(student_id, subject_id, term_id)
);

CREATE TABLE IF NOT EXISTS report_card_meta (
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  conduct TEXT,
  teacher_comment TEXT,
  head_teacher_comment TEXT,
  promotion_decision TEXT CHECK (promotion_decision IN ('promoted','repeat','pending')),
  published_at TEXT,
  PRIMARY KEY (student_id, term_id)
);

CREATE TABLE IF NOT EXISTS fee_structures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  description TEXT,
  UNIQUE(class_id, term_id)
);

CREATE TABLE IF NOT EXISTS fee_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('momo','orange','other')),
  reference TEXT,
  paid_at TEXT NOT NULL DEFAULT (datetime('now')),
  recorded_by TEXT NOT NULL,
  last_modified_at TEXT NOT NULL DEFAULT (datetime('now')),
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS license (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  token TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('admin','teacher')),
  actor_label TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  local_json TEXT NOT NULL,
  remote_json TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0,
  resolution TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_marks_class_term ON marks(class_id, term_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);
