import { Request, Response, NextFunction } from 'express'
import { actionService } from '../services/ActionService.js'

export class ActionController {
  async listActions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = req.query.category as string | undefined
      const actions = await actionService.listActions(category)

      res.status(200).json({
        status: 'success',
        results: actions.length,
        data: { actions },
      })
    } catch (error) {
      next(error)
    }
  }

  async getAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id)
      const action = await actionService.getActionById(id)

      res.status(200).json({
        status: 'success',
        data: { action },
      })
    } catch (error) {
      next(error)
    }
  }

  async completeAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id)
      const currentUserId = (req.headers['x-user-id'] as string) || 'user-1'
      const result = await actionService.completeAction(currentUserId, id, req.body)

      res.status(200).json({
        status: 'success',
        message: result.message,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const actionController = new ActionController()
