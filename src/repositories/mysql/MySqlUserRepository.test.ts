import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createConnection, RowDataPacket } from 'mysql2/promise'
import test from 'node:test'
import 'dotenv/config'
import { AppError } from '../../errors/AppError.js'
import { loadDatabaseConfig } from '../../config/database.js'
import { runMigrations } from '../../data/migrate.js'
import { createDatabasePool } from '../../database/pool.js'
import { MySqlUserRepository } from './MySqlUserRepository.js'

const hasTestDatabaseConfig = [
  process.env.DB_HOST,
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
].every(Boolean)
const mysqlConfig = hasTestDatabaseConfig
  ? loadDatabaseConfig({ ...process.env, PERSISTENCE: 'mysql' }).mysql
  : null

test('MySQL migrations are repeatable and reject concurrent duplicate email registrations', {
  skip: !mysqlConfig,
}, async () => {
  if (!mysqlConfig) return

  const database = `iclean_test_${randomUUID().replace(/-/g, '')}`
  const adminConnection = await createConnection({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
  })

  let pool: ReturnType<typeof createDatabasePool> | undefined
  try {
    await adminConnection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    pool = createDatabasePool({ ...mysqlConfig, database })
    await runMigrations(pool)
    await runMigrations(pool)

    const repository = new MySqlUserRepository(pool)
    const registration = (username: string) =>
      repository.create({
        name: 'Test User',
        username,
        email: 'duplicate@example.test',
        passwordHash: 'scrypt-hash',
        bio: '',
        avatarUrl: '',
      })

    const results = await Promise.allSettled([
      registration('@duplicate-one'),
      registration('@duplicate-two'),
    ])
    const createdUsers = results.filter(result => result.status === 'fulfilled')
    const rejectedRegistrations = results.filter(result => result.status === 'rejected')

    assert.equal(
      createdUsers.length,
      1,
      results
        .filter(result => result.status === 'rejected')
        .map(result => result.status === 'rejected' ? String(result.reason) : '')
        .join('; ')
    )
    assert.equal(rejectedRegistrations.length, 1)
    assert.ok(
      rejectedRegistrations[0].status === 'rejected' &&
      rejectedRegistrations[0].reason instanceof AppError
    )
    assert.equal(
      rejectedRegistrations[0].status === 'rejected'
        ? rejectedRegistrations[0].reason.statusCode
        : null,
      409
    )
    assert.equal(
      (await repository.findByEmail(' DUPLICATE@example.test '))?.email,
      'duplicate@example.test'
    )
  } finally {
    await pool?.end()
    await adminConnection.query(`DROP DATABASE IF EXISTS \`${database}\``)
    await adminConnection.end()
  }
})

test('upgrades a legacy users table without losing accounts and enforces normalized email uniqueness', {
  skip: !mysqlConfig,
}, async () => {
  if (!mysqlConfig) return

  const database = `iclean_test_${randomUUID().replace(/-/g, '')}`
  const adminConnection = await createConnection({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
  })

  let pool: ReturnType<typeof createDatabasePool> | undefined
  try {
    await adminConnection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    pool = createDatabasePool({ ...mysqlConfig, database })
    await pool.query(`CREATE TABLE users (
      id VARCHAR(36) NOT NULL,
      name VARCHAR(150) NOT NULL,
      username VARCHAR(60) NOT NULL,
      email VARCHAR(254) NOT NULL,
      password_hash VARCHAR(255) NULL,
      bio TEXT NULL,
      avatar_url VARCHAR(500) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_users_username (username),
      UNIQUE KEY uk_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
    await pool.execute(
      `INSERT INTO users (id, name, username, email, password_hash, bio, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['legacy-user', 'Legacy User', '@legacy-user', 'Legacy@Example.test', null, '', '']
    )

    await runMigrations(pool)
    const repository = new MySqlUserRepository(pool)
    assert.equal((await repository.findByEmail(' legacy@example.test '))?.id, 'legacy-user')
    await assert.rejects(
      repository.create({
        name: 'Duplicate Legacy',
        username: '@legacy-duplicate',
        email: 'legacy@example.test',
        passwordHash: 'scrypt-hash',
        bio: '',
        avatarUrl: '',
      }),
      (error: unknown) => error instanceof AppError && error.statusCode === 409
    )

    const [columns] = await pool.query<Array<RowDataPacket & { data_type: string }>>(
      `SELECT DATA_TYPE AS data_type FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url'`
    )
    assert.equal(columns[0].data_type, 'longtext')
  } finally {
    await pool?.end()
    await adminConnection.query(`DROP DATABASE IF EXISTS \`${database}\``)
    await adminConnection.end()
  }
})
