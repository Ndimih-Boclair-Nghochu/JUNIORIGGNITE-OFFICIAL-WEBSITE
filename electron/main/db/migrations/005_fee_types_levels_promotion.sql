-- Fee types (e.g. Tuition, Exam Fees, PTA). Payments optionally reference one;
-- when at least one type exists the UI requires choosing it before recording.
CREATE TABLE IF NOT EXISTS fee_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE fee_payments ADD COLUMN fee_type_id INTEGER REFERENCES fee_types(id) ON DELETE SET NULL;

-- Class levels drive promotion order. One level ("Class One") can hold many
-- class streams ("Class One A", "Class One B"); promotion moves a pupil to a
-- class in the level with the next-higher order_index.
CREATE TABLE IF NOT EXISTS class_levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  order_index INTEGER NOT NULL
);

ALTER TABLE classes ADD COLUMN level_id INTEGER REFERENCES class_levels(id) ON DELETE SET NULL;

-- Minimum average a pupil must reach to be promoted automatically. The admin
-- can still promote pupils below it explicitly.
ALTER TABLE schools ADD COLUMN promotion_average REAL NOT NULL DEFAULT 10;
