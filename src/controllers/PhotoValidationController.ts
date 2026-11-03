import { Request, Response, NextFunction } from 'express'
import { validatePhotoWithGemini } from '../services/GeminiService.js'
import { actionService } from '../services/ActionService.js'
import { AppError } from '../errors/AppError.js'

export class PhotoValidationController {
  /**
   * POST /api/v1/actions/:id/validate-photo
   * Body: { photoUrl: string (base64 ou URL), description?: string }
   */
  async validatePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actionId = String(req.params.id)
      const { photoUrl, description } = req.body as { photoUrl?: string; description?: string }

      if (!photoUrl) {
        throw new AppError('O campo photoUrl é obrigatório.', 400)
      }

      // Valida se é base64 ou URL suportada
      const isBase64 = photoUrl.startsWith('data:image/')
      const isUrl = photoUrl.startsWith('http://') || photoUrl.startsWith('https://')

      if (!isBase64 && !isUrl) {
        throw new AppError('photoUrl deve ser uma imagem em base64 (data:image/...) ou URL válida.', 400)
      }

      // Busca a ação para obter contexto
      const action = await actionService.getActionById(actionId)

      let imagePayload = photoUrl

      // Se for URL externa, faz download e converte para base64
      if (isUrl) {
        try {
          const fetchRes = await fetch(photoUrl)
          if (!fetchRes.ok) {
            throw new AppError('Não foi possível baixar a imagem da URL fornecida.', 400)
          }
          const contentType = fetchRes.headers.get('content-type') ?? 'image/jpeg'
          const buffer = await fetchRes.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          imagePayload = `data:${contentType};base64,${base64}`
        } catch (err) {
          if (err instanceof AppError) throw err
          throw new AppError('Erro ao processar imagem da URL. Use base64.', 400)
        }
      }

      const validation = await validatePhotoWithGemini(
        imagePayload,
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

