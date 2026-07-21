import m001 from './001_init.sql?raw'
import m002 from './002_school_cover.sql?raw'
import m003 from './003_licensing.sql?raw'
import m004 from './004_principal.sql?raw'
import m005 from './005_fee_types_levels_promotion.sql?raw'
import m006 from './006_fee_type_amount.sql?raw'
import m007 from './007_password_recovery.sql?raw'

// Ordered list of migrations. Add new entries at the end — never edit an
// already-shipped migration's SQL, only append new ones.
export const MIGRATIONS: { filename: string; sql: string }[] = [
  { filename: '001_init.sql', sql: m001 },
  { filename: '002_school_cover.sql', sql: m002 },
  { filename: '003_licensing.sql', sql: m003 },
  { filename: '004_principal.sql', sql: m004 },
  { filename: '005_fee_types_levels_promotion.sql', sql: m005 },
  { filename: '006_fee_type_amount.sql', sql: m006 },
  { filename: '007_password_recovery.sql', sql: m007 }
]
