import { Post, Comment, PostCategory } from '../../types/index.js'
import { IPostRepository } from '../interfaces.js'
import { initialPosts } from '../../data/seed.js'

export class InMemoryPostRepository implements IPostRepository {
  private posts: Post[] = JSON.parse(JSON.stringify(initialPosts))

  async findAll(category?: string): Promise<Post[]> {
    if (!category || category === 'all') {
      return this.posts.map(p => ({ ...p, comments: [...p.comments] }))
    }
    return this.posts
      .filter(p => p.category === category)
      .map(p => ({ ...p, comments: [...p.comments] }))
  }

  async findById(id: string): Promise<Post | null> {
    const post = this.posts.find(p => p.id === id)
    return post ? { ...post, comments: [...post.comments] } : null
  }

  async create(data: Omit<Post, 'id' | 'createdAt' | 'likes' | 'likedByMe' | 'likedByUsers' | 'comments'>): Promise<Post> {
    const newPost: Post = {
      ...data,
      id: `post-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      likes: 0,
      likedByMe: false,
      likedByUsers: [],
      comments: [],
      createdAt: new Date().toISOString(),
    }
    this.posts.unshift(newPost)
    return { ...newPost, comments: [] }
  }

  async update(id: string, updates: Partial<Post>): Promise<Post | null> {
    const post = this.posts.find(p => p.id === id)
    if (!post) return null
    Object.assign(post, updates)
    return { ...post }
  }

  async toggleLike(postId: string, userId: string): Promise<{ post: Post; liked: boolean }> {
    const post = this.posts.find(p => p.id === postId)
    if (!post) {
      throw new Error(`Publicação com ID "${postId}" não encontrada`)
    }

    if (!post.likedByUsers) {
      post.likedByUsers = []
    }

    const alreadyLiked = post.likedByUsers.includes(userId)
    if (alreadyLiked) {
      post.likedByUsers = post.likedByUsers.filter(id => id !== userId)
      post.likes = Math.max(0, post.likes - 1)
      post.likedByMe = false
    } else {
      post.likedByUsers.push(userId)
      post.likes += 1
      post.likedByMe = true
    }

    return { post: { ...post, comments: [...post.comments] }, liked: !alreadyLiked }
  }

  async addComment(postId: string, commentData: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment | null> {
    const post = this.posts.find(p => p.id === postId)
    if (!post) return null

    const newComment: Comment = {
      ...commentData,
      id: `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    }
    post.comments.push(newComment)
    return { ...newComment }
  }

  async syncAuthor(authorId: string, authorName: string, authorAvatarUrl: string): Promise<void> {
    for (const post of this.posts) {
      if (post.authorId === authorId) {
        post.authorName = authorName
        post.authorAvatarUrl = authorAvatarUrl
      }
      for (const comment of post.comments) {
        if (comment.authorId === authorId) {
          comment.authorName = authorName
          comment.authorAvatarUrl = authorAvatarUrl
        }
      }
    }
  }
}

export const inMemoryPostRepository = new InMemoryPostRepository()
