import { config } from '../config/env.js'
import { createDatabasePool } from '../database/pool.js'
import { RowDataPacket } from 'mysql2/promise'
import {
  IActionRepository,
  IPostRepository,
  IProgressRepository,
  IUserRepository,
} from './interfaces.js'
import { inMemoryActionRepository } from './inMemory/InMemoryActionRepository.js'
import { inMemoryPostRepository } from './inMemory/InMemoryPostRepository.js'
import { inMemoryProgressRepository } from './inMemory/InMemoryProgressRepository.js'
import { inMemoryUserRepository } from './inMemory/InMemoryUserRepository.js'
import { MySqlActionRepository } from './mysql/MySqlActionRepository.js'
import { MySqlPostRepository } from './mysql/MySqlPostRepository.js'
import { MySqlProgressRepository } from './mysql/MySqlProgressRepository.js'
import { MySqlUserRepository } from './mysql/MySqlUserRepository.js'

const mysqlPool = config.persistence === 'mysql' && config.mysql
  ? createDatabasePool(config.mysql)
  : null

export const userRepository: IUserRepository = mysqlPool
  ? new MySqlUserRepository(mysqlPool)
  : inMemoryUserRepository

export const postRepository: IPostRepository = mysqlPool
  ? new MySqlPostRepository(mysqlPool)
  : inMemoryPostRepository

export const actionRepository: IActionRepository = mysqlPool
  ? new MySqlActionRepository(mysqlPool)
  : inMemoryActionRepository

export const progressRepository: IProgressRepository = mysqlPool
  ? new MySqlProgressRepository(mysqlPool)
  : inMemoryProgressRepository

export async function closeDatabasePool(): Promise<void> {
  await mysqlPool?.end()
}

export async function checkDatabaseConnection(): Promise<void> {
  if (!mysqlPool) return

  await mysqlPool.query('SELECT 1')
  const [rows] = await mysqlPool.query<Array<RowDataPacket & { version: string }>>(
    'SELECT version FROM schema_migrations'
  )
  const applied = new Set(rows.map(row => row.version))
  for (const version of ['001_core_tables', '002_persistent_progress_and_normalized_email']) {
    if (!applied.has(version)) {
      throw new Error('MySQL migrations are incomplete; run "npm run db:migrate" before starting the API')
    }
  }
}
