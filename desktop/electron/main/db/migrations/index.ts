import m001 from './001_init.sql?raw'
import m002 from './002_school_cover.sql?raw'

// Ordered list of migrations. Add new entries at the end — never edit an
// already-shipped migration's SQL, only append new ones.
export const MIGRATIONS: { filename: string; sql: string }[] = [
  { filename: '001_init.sql', sql: m001 },
  { filename: '002_school_cover.sql', sql: m002 }
]
