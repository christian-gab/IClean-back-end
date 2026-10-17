import { IPostRepository, IUserRepository, IProgressRepository } from '../repositories/interfaces.js'
import { inMemoryPostRepository } from '../repositories/inMemory/InMemoryPostRepository.js'
import { inMemoryUserRepository } from '../repositories/inMemory/InMemoryUserRepository.js'
import { inMemoryProgressRepository } from '../repositories/inMemory/InMemoryProgressRepository.js'
import { Post, Comment } from '../types/index.js'
import { AppError } from '../errors/AppError.js'
import { CreatePostInput } from '../validations/schemas.js'

export class PostService {
  constructor(
    private postRepo: IPostRepository = inMemoryPostRepository,
    private userRepo: IUserRepository = inMemoryUserRepository,
    private progressRepo: IProgressRepository = inMemoryProgressRepository
  ) {}

  async listPosts(category?: string, currentUserId = 'user-1'): Promise<Post[]> {
    const posts = await this.postRepo.findAll(category)
    return posts.map(post => ({
      ...post,
      likedByMe: post.likedByUsers ? post.likedByUsers.includes(currentUserId) : post.likedByMe,
    }))
  }

  async getPostById(id: string, currentUserId = 'user-1'): Promise<Post> {
    const post = await this.postRepo.findById(id)
    if (!post) {
      throw new AppError('Publicação não encontrada', 404)
    }
    return {
      ...post,
      likedByMe: post.likedByUsers ? post.likedByUsers.includes(currentUserId) : post.likedByMe,
    }
  }

  async createPost(userId: string, data: CreatePostInput): Promise<{ post: Post; unlockedAchievements: string[] }> {
    const user = await this.userRepo.findById(userId)
    const authorName = user ? user.name : 'Usuário'
    const authorAvatarUrl = user ? user.avatarUrl : 'https://api.dicebear.com/9.x/avataaars/svg?seed=default&backgroundColor=b6e3f4'

    const post = await this.postRepo.create({
      authorId: userId,
      authorName,
      authorAvatarUrl,
      text: data.text,
      category: data.category,
      imageUrl: data.imageUrl,
    })

    // Track user progress
    const progress = await this.progressRepo.incrementPostsCreated(userId)

    // Check achievement unlock
    const newAchievements: string[] = []
    if (progress.postsCreated >= 1 && !progress.unlockedAchievements.includes('ach-first-post')) {
      newAchievements.push('ach-first-post')
    }
    if (progress.postsCreated >= 5 && !progress.unlockedAchievements.includes('ach-5-posts')) {
      newAchievements.push('ach-5-posts')
    }

    if (newAchievements.length > 0) {
      await this.progressRepo.unlockAchievements(userId, newAchievements)
    }

    return { post, unlockedAchievements: newAchievements }
  }

  async toggleLike(postId: string, userId = 'user-1'): Promise<{ postId: string; likes: number; likedByMe: boolean }> {
    const post = await this.postRepo.findById(postId)
    if (!post) {
      throw new AppError('Publicação não encontrada', 404)
    }

    const result = await this.postRepo.toggleLike(postId, userId)
    return {
      postId,
      likes: result.post.likes,
      likedByMe: result.liked,
    }
  }

  async addComment(postId: string, userId: string, text: string): Promise<Comment> {
    const post = await this.postRepo.findById(postId)
    if (!post) {
      throw new AppError('Publicação não encontrada', 404)
    }

    const user = await this.userRepo.findById(userId)
    const authorName = user ? user.name : 'Usuário'
    const authorAvatarUrl = user ? user.avatarUrl : 'https://api.dicebear.com/9.x/avataaars/svg?seed=default&backgroundColor=b6e3f4'

    const comment = await this.postRepo.addComment(postId, {
      authorId: userId,
      authorName,
      authorAvatarUrl,
      text,
    })

    if (!comment) {
      throw new AppError('Falha ao adicionar comentário', 500)
    }

    return comment
  }
}

export const postService = new PostService()
