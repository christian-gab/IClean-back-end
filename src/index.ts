import { createApp } from './app.js'
import { config } from './config/env.js'

const app = createApp()

app.listen(config.port, () => {
  console.log(`===============================================`)
  console.log(`🚀 IClean Backend API rodando com sucesso!`)
  console.log(`📡 URL: http://localhost:${config.port}`)
  console.log(`📑 Prefixo da API: ${config.apiPrefix}`)
  console.log(`🌍 Ambiente: ${config.nodeEnv}`)
  console.log(`===============================================`)
})
