import dotenv from 'dotenv'
import { randomBytes } from 'node:crypto'
import { loadDatabaseConfig } from './database.js'
import { getEnvironmentFilePath } from './environment.js'

const nodeEnv = process.env.NODE_ENV || 'development'
dotenv.config({ path: getEnvironmentFilePath(nodeEnv) })

const configuredAuthSecret = process.env.AUTH_SECRET
const database = loadDatabaseConfig(process.env)

if (
  nodeEnv === 'production' &&
  (!configuredAuthSecret || Buffer.byteLength(configuredAuthSecret, 'utf8') < 32)
) {
  throw new Error('AUTH_SECRET deve conter pelo menos 32 bytes em produção')
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  authSecret: configuredAuthSecret || randomBytes(32).toString('hex'),
  ...database,
}
