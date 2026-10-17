import { Request, Response, NextFunction } from 'express'
import { authService } from '../services/AuthService.js'

export class UserController {
  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id)
      const user = await authService.getUserById(id)
      res.status(200).json({
        status: 'success',
        data: { user },
      })
    } catch (error) {
      next(error)
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id)
      const updatedUser = await authService.updateProfile(id, req.body)
      res.status(200).json({
        status: 'success',
        message: 'Perfil atualizado com sucesso',
        data: { user: updatedUser },
      })
    } catch (error) {
      next(error)
    }
  }
}

export const userController = new UserController()
