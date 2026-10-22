import { Request, Response, NextFunction } from 'express'
import { authService } from '../services/AuthService.js'
import { getAuthenticatedUserId } from '../utils/auth.js'
import { AppError } from '../errors/AppError.js'

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, token } = await authService.login(req.body)
      res.status(200).json({
        status: 'success',
        data: { user, token },
      })
    } catch (error) {
      next(error)
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, token } = await authService.register(req.body)
      res.status(201).json({
        status: 'success',
        data: { user, token },
      })
    } catch (error) {
      next(error)
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req)
      if (!userId) {
        throw new AppError('Não autenticado', 401)
      }
      const user = await authService.getUserById(userId)
      res.status(200).json({
        status: 'success',
        data: { user },
      })
    } catch (error) {
      next(error)
    }
  }
}

export const authController = new AuthController()
