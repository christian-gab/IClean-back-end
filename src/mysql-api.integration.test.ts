import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createConnection } from 'mysql2/promise'
import test from 'node:test'
import 'dotenv/config'
import { loadDatabaseConfig } from './config/database.js'
import { runMigrations } from './data/migrate.js'
import { createDatabasePool } from './database/pool.js'
import { MySqlUserRepository } from './repositories/mysql/MySqlUserRepository.js'

const hasTestDatabaseConfig = [
  process.env.DB_HOST,
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
].every(Boolean)
const mysqlConfig = hasTestDatabaseConfig
  ? loadDatabaseConfig({ ...process.env, PERSISTENCE: 'mysql' }).mysql
  : null

test('the API registers and authenticates accounts through MySQL repositories', {
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

  let migrationPool: ReturnType<typeof createDatabasePool> | undefined
  let server: import('node:http').Server | undefined
  let closeRepositories: (() => Promise<void>) | undefined
  try {
    await adminConnection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    migrationPool = createDatabasePool({ ...mysqlConfig, database })
    await runMigrations(migrationPool)

    process.env.NODE_ENV = 'test'
    process.env.PERSISTENCE = 'mysql'
    process.env.DB_HOST = mysqlConfig.host
    process.env.DB_PORT = String(mysqlConfig.port)
    process.env.DB_NAME = database
    process.env.DB_USER = mysqlConfig.user
    process.env.DB_PASSWORD = mysqlConfig.password
    process.env.AUTH_SECRET = 'test-auth-secret-with-at-least-32-bytes'
    process.env.CORS_ORIGIN = 'http://localhost:4173'

    const [{ createApp }, repositories] = await Promise.all([
      import('./app.js'),
      import('./repositories/index.js'),
    ])
    closeRepositories = async () => repositories.closeDatabasePool()
    await repositories.checkDatabaseConnection()

    server = createApp().listen(0)
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    const baseUrl = `http://127.0.0.1:${address.port}/api/v1`
    const email = `mysql-${randomUUID()}@example.test`

    const registration = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'MySQL User', email, password: 'strongpass123' }),
    })
    assert.equal(registration.status, 201)
    const registered = await registration.json() as {
      data: { user: { id: string }; token: string }
    }
    const storedUser = await new MySqlUserRepository(migrationPool).findByEmail(email)
    assert.equal(storedUser?.id, registered.data.user.id)

    const duplicate = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        email: email.toUpperCase(),
        password: 'strongpass123',
      }),
    })
    assert.equal(duplicate.status, 409)

    const login = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'strongpass123' }),
    })
    assert.equal(login.status, 200)

    const me = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${registered.data.token}` },
    })
    assert.equal(me.status, 200)
    const profile = await me.json() as { data: { user: { id: string } } }
    assert.equal(profile.data.user.id, registered.data.user.id)
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close(error => error ? reject(error) : resolve())
      })
    }
    await closeRepositories?.()
    await migrationPool?.end()
    await adminConnection.query(`DROP DATABASE IF EXISTS \`${database}\``)
    await adminConnection.end()
  }
})
