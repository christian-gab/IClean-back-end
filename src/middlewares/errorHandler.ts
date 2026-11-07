import { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/AppError.js'
import { config } from '../config/env.js'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    })
    return
  }

  if ('status' in err && (err.status === 429 || err.status === 503)) {
    console.error('[UPSTREAM SERVICE UNAVAILABLE]', err)
    res.status(503).json({
      status: 'error',
      message: 'O serviço de validação está temporariamente em alta demanda. Tente novamente em alguns instantes.',
    })
    return
  }

  console.error('[UNEXPECTED ERROR]', err)

  res.status(500).json({
    status: 'error',
    message: err instanceof AppError ? err.message : (err.message || 'Ocorreu um erro interno no servidor'),
    ...(config.nodeEnv === 'development' ? { stack: err.stack } : {}),
  })
}
