import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { config } from './config/env.js'
import { mainRouter } from './routes/index.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { AppError } from './errors/AppError.js'

export function createApp(): Express {
  const app = express()

  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    })
  )

  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  app.use((req: Request, _res: Response, next: NextFunction) => {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`)
    next()
  })

  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'IClean API (EcoSocial Backend)',
      version: '1.0.0',
      status: 'online',
      documentation: `${config.apiPrefix}`,
      timestamp: new Date().toISOString(),
    })
  })

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() })
  })

  app.use(config.apiPrefix, mainRouter)

  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(`Rota não encontrada: ${req.method} ${req.originalUrl}`, 404))
  })

  app.use(errorHandler)

  return app
}
