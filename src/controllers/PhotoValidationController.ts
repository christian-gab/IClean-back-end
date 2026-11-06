import { Request, Response, NextFunction } from 'express'
import { validatePhotoWithGemini } from '../services/GeminiService.js'
import { actionService } from '../services/ActionService.js'
import { AppError } from '../errors/AppError.js'
import { getAuthenticatedUserId } from '../utils/auth.js'
import { ValidatePhotoInput } from '../validations/schemas.js'

export class PhotoValidationController {
  /**
   * POST /api/v1/actions/:id/validate-photo
   * Body: { photoUrl: string (imagem em base64), description?: string }
   */
  async validatePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!getAuthenticatedUserId(req)) {
        throw new AppError('Não autenticado', 401)
      }

      const actionId = String(req.params.id)
      const { photoUrl, description } = req.body as ValidatePhotoInput

      const action = await actionService.getActionById(actionId)

      const validation = await validatePhotoWithGemini(
        photoUrl,
        action.title,
        action.description,
        description
      )

      res.status(200).json({
        status: 'success',
        data: {
          actionId,
          actionTitle: action.title,
          ...validation,
        },
      })
    } catch (error) {
      next(error)
    }
  }
}

export const photoValidationController = new PhotoValidationController()
