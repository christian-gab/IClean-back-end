import { createPool as createMySqlPool, Pool } from 'mysql2/promise'
import { MySqlConfig } from '../config/database.js'

export function createDatabasePool(database: MySqlConfig): Pool {
  return createMySqlPool({
    ...database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    timezone: 'Z',
  })
}
