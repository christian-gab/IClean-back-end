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

  console.error('[UNEXPECTED ERROR]', err)

  res.status(500).json({
    status: 'error',
    message: 'Ocorreu um erro interno no servidor',
    ...(config.nodeEnv === 'development' ? { stack: err.stack } : {}),
  })
}
