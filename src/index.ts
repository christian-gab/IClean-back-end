import dns from 'node:dns'
try {
  dns.setDefaultResultOrder?.('ipv4first')
} catch {}

import { createApp } from './app.js'
import { config } from './config/env.js'
import { checkDatabaseConnection, closeDatabasePool } from './repositories/index.js'

const app = createApp()

async function startServer(): Promise<void> {
  await checkDatabaseConnection()
  const server = app.listen(config.port, () => {
    console.log(`===============================================`)
    console.log(`🚀 IClean Backend API rodando com sucesso!`)
    console.log(`📡 URL: http://localhost:${config.port}`)
    console.log(`📑 Prefixo da API: ${config.apiPrefix}`)
    console.log(`🌐 Ambiente: ${config.nodeEnv}`)
    console.log(`===============================================`)
  })

  const shutdown = (signal: string) => {
    console.log(`Encerrando API após ${signal}`)
    server.close((error?: Error) => {
      if (error) {
        console.error('Falha ao encerrar o servidor HTTP:', error)
        process.exitCode = 1
      }
      void closeDatabasePool().catch((databaseError: unknown) => {
        console.error('Falha ao fechar o pool MySQL:', databaseError)
        process.exitCode = 1
      })
    })
  }

  process.once('SIGINT', () => shutdown('SIGINT'))
  process.once('SIGTERM', () => shutdown('SIGTERM'))
  server.once('error', (error: Error) => {
    console.error('Falha ao iniciar o servidor HTTP:', error)
    void closeDatabasePool().catch((databaseError: unknown) => {
      console.error('Falha ao fechar o pool MySQL:', databaseError)
      process.exitCode = 1
    })
    process.exitCode = 1
  })
}

void startServer().catch(error => {
  console.error('Falha ao iniciar a API:', error)
  void closeDatabasePool().catch(databaseError => {
    console.error('Falha ao fechar o pool MySQL:', databaseError)
  })
  process.exitCode = 1
})