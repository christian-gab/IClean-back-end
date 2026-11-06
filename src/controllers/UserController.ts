import { Request, Response, NextFunction } from 'express'
import { authService } from '../services/AuthService.js'
import { getAuthenticatedUserId } from '../utils/auth.js'
import { AppError } from '../errors/AppError.js'

export class UserController {
  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id)
      const user = await authService.getPublicUserById(id)
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
      const currentUserId = getAuthenticatedUserId(req)
      if (!currentUserId) {
        throw new AppError('Não autenticado', 401)
      }

      const id = String(req.params.id)
      if (currentUserId !== id) {
        throw new AppError('Você não tem permissão para alterar o perfil de outro usuário', 403)
      }

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
