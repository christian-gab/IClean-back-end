import { Request, Response, NextFunction } from 'express'
import { progressService } from '../services/ProgressService.js'

export class ProgressController {
  async getProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.params.userId as string) || (req.headers['x-user-id'] as string) || 'user-1'
      const progress = await progressService.getUserProgress(userId)

      res.status(200).json({
        status: 'success',
        data: { progress },
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
      const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'user-1'
      const achievements = await progressService.getAchievements(userId)

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
      const userId = (req.headers['x-user-id'] as string) || 'user-1'
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
