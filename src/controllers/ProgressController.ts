import { Request, Response, NextFunction } from 'express'
import { progressService } from '../services/ProgressService.js'
import { getAuthenticatedUserId } from '../utils/auth.js'
import { AppError } from '../errors/AppError.js'

export class ProgressController {
  async getProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authenticatedUserId = getAuthenticatedUserId(req)
      if (!authenticatedUserId) {
        throw new AppError('Não autenticado', 401)
      }

      const requestedUserId = req.params.userId
      if (requestedUserId && requestedUserId !== authenticatedUserId) {
        throw new AppError('Você não tem permissão para acessar o progresso de outro usuário', 403)
      }

      const userId = authenticatedUserId
      const progress = await progressService.getUserProgress(userId)

      res.status(200).json({
        status: 'success',
        data: { progress },
      })
    } catch (error) {
      next(error)
    }
  }

  async getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authenticatedUserId = getAuthenticatedUserId(req)
      if (!authenticatedUserId) {
        throw new AppError('Não autenticado', 401)
      }

      const leaderboard = await progressService.getLeaderboard()
      res.status(200).json({
        status: 'success',
        results: leaderboard.length,
        data: { leaderboard },
      })
    } catch (error) {
      next(error)
    }
  }

  async getLevels(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const levels = await progressService.getLevels()
      res.status(200).json({
        status: 'success',
        results: levels.length,
        data: { levels },
      })
    } catch (error) {
      next(error)
    }
  }

  async getAchievements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authenticatedUserId = getAuthenticatedUserId(req)
      const requestedUserId = req.query.userId
      if (
        typeof requestedUserId === 'string' &&
        requestedUserId !== authenticatedUserId
      ) {
        throw new AppError('Você não tem permissão para acessar as conquistas de outro usuário', 403)
      }

      const achievements = await progressService.getAchievements(authenticatedUserId)

      res.status(200).json({
        status: 'success',
        results: achievements.length,
        data: { achievements },
      })
    } catch (error) {
      next(error)
    }
  }

  async resetProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req)
      if (!userId) {
        throw new AppError('Não autenticado', 401)
      }

      const progress = await progressService.resetProgress(userId)

      res.status(200).json({
        status: 'success',
        message: 'Progresso do usuário reiniciado com sucesso',
        data: { progress },
      })
    } catch (error) {
      next(error)
    }
  }
}

export const progressController = new ProgressController()
