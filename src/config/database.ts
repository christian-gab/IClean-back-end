export interface MySqlConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: string | { minVersion?: string; rejectUnauthorized?: boolean }
}

export type DatabaseConfig =
  | { persistence: 'memory'; mysql: null }
  | { persistence: 'mysql'; mysql: MySqlConfig }

export function loadDatabaseConfig(env: NodeJS.ProcessEnv): DatabaseConfig {
  const nodeEnv = env.NODE_ENV || 'development'
  const persistence = env.PERSISTENCE || (nodeEnv === 'production' ? 'mysql' : 'memory')

  if (persistence !== 'memory' && persistence !== 'mysql') {
    throw new Error('PERSISTENCE must be "memory" or "mysql"')
  }

  if (nodeEnv === 'production' && persistence !== 'mysql') {
    throw new Error('PERSISTENCE must be "mysql" in production')
  }

  if (persistence === 'memory') {
    return { persistence, mysql: null }
  }

  const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const
  const missing = required.filter(key => !env[key]?.trim())
  if (missing.length > 0) {
    const missingList =
      missing.length === 1
        ? missing[0]
        : `${missing.slice(0, -1).join(', ')}, and ${missing[missing.length - 1]}`
    throw new Error(`${missingList} are required when PERSISTENCE is "mysql"`)
  }

  const port = Number(env.DB_PORT || '3306')
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535')
  }

  const ssl =
    env.DB_SSL === 'true' || env.DB_HOST?.includes('tidbcloud.com')
      ? { minVersion: 'TLSv1.2', rejectUnauthorized: true }
      : undefined

  return {
    persistence,
    mysql: {
      host: env.DB_HOST!.trim(),
      port,
      database: env.DB_NAME!.trim(),
      user: env.DB_USER!.trim(),
      password: env.DB_PASSWORD!,
      ...(ssl ? { ssl } : {}),
    },
  }
}
