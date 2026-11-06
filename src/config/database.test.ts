import assert from 'node:assert/strict'
import test from 'node:test'
import { loadDatabaseConfig } from './database.js'

test('defaults to in-memory persistence outside production', () => {
  assert.deepEqual(loadDatabaseConfig({ NODE_ENV: 'development' }), {
    persistence: 'memory',
    mysql: null,
  })
})

test('requires complete MySQL connection settings when persistence is MySQL', () => {
  assert.throws(
    () => loadDatabaseConfig({ PERSISTENCE: 'mysql' }),
    /DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD are required/
  )
})

test('loads MySQL connection settings with the standard port by default', () => {
  assert.deepEqual(
    loadDatabaseConfig({
      PERSISTENCE: 'mysql',
      DB_HOST: 'localhost',
      DB_NAME: 'iclean',
      DB_USER: 'iclean_app',
      DB_PASSWORD: 'local-secret',
    }),
    {
      persistence: 'mysql',
      mysql: {
        host: 'localhost',
        port: 3306,
        database: 'iclean',
        user: 'iclean_app',
        password: 'local-secret',
      },
    }
  )
})

test('rejects invalid persistence modes and MySQL ports', () => {
  assert.throws(
    () => loadDatabaseConfig({ PERSISTENCE: 'postgres' }),
    /PERSISTENCE must be "memory" or "mysql"/
  )
  assert.throws(
    () =>
      loadDatabaseConfig({
        PERSISTENCE: 'mysql',
        DB_HOST: 'localhost',
        DB_PORT: '70000',
        DB_NAME: 'iclean',
        DB_USER: 'iclean_app',
        DB_PASSWORD: 'local-secret',
      }),
    /DB_PORT must be an integer between 1 and 65535/
  )
})

test('requires MySQL persistence in production', () => {
  assert.throws(
    () => loadDatabaseConfig({ NODE_ENV: 'production', PERSISTENCE: 'memory' }),
    /PERSISTENCE must be "mysql" in production/
  )
})
