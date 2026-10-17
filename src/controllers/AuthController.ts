import { Request, Response, NextFunction } from 'express'
import { authService } from '../services/AuthService.js'

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, token } = await authService.login(req.body)
      res.status(200).json({
        status: 'success',
        data: {
          user,
          token,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // By default or through query/header userId
      const userId = (req.headers['x-user-id'] as string) || 'user-1'
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
