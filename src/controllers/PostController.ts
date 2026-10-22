import { Request, Response, NextFunction } from 'express'
import { postService } from '../services/PostService.js'
import { getAuthenticatedUserId } from '../utils/auth.js'
import { AppError } from '../errors/AppError.js'

export class PostController {
  async listPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = req.query.category as string | undefined
      const currentUserId = getAuthenticatedUserId(req) || 'user-1'
      const posts = await postService.listPosts(category, currentUserId)

      res.status(200).json({
        status: 'success',
        results: posts.length,
        data: { posts },
      })
    } catch (error) {
      next(error)
    }
  }

  async getPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id)
      const currentUserId = getAuthenticatedUserId(req) || 'user-1'
      const post = await postService.getPostById(id, currentUserId)

      res.status(200).json({
        status: 'success',
        data: { post },
      })
    } catch (error) {
      next(error)
    }
  }

  async createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = getAuthenticatedUserId(req) || (req.body.authorId as string)
      if (!currentUserId) {
        throw new AppError('Não autenticado', 401)
      }
      const { post, unlockedAchievements } = await postService.createPost(currentUserId, req.body)

      res.status(201).json({
        status: 'success',
        message: 'Publicação criada com sucesso',
        data: {
          post,
          unlockedAchievements,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async toggleLike(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id)
      const currentUserId = getAuthenticatedUserId(req)
      if (!currentUserId) {
        throw new AppError('Não autenticado', 401)
      }
      const result = await postService.toggleLike(id, currentUserId)

      res.status(200).json({
        status: 'success',
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id)
      const currentUserId = getAuthenticatedUserId(req)
      if (!currentUserId) {
        throw new AppError('Não autenticado', 401)
      }
      const { text } = req.body

      const comment = await postService.addComment(id, currentUserId, text)

      res.status(201).json({
        status: 'success',
        message: 'Comentário adicionado com sucesso',
        data: { comment },
      })
    } catch (error) {
      next(error)
    }
  }
}

export const postController = new PostController()
