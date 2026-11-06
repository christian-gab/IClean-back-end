import { config } from '../config/env.js'
import { createDatabasePool } from '../database/pool.js'
import { runMigrations } from './migrate.js'

if (config.persistence !== 'mysql' || !config.mysql) {
  throw new Error('Configure PERSISTENCE=mysql and DB_* variables before running migrations')
}

const pool = createDatabasePool(config.mysql)
try {
  await runMigrations(pool)
  console.log('MySQL migrations and idempotent seed completed.')
} finally {
  await pool.end()
}
