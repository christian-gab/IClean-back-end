import { User, Post, Comment, SustainableAction, UserProgress, Level, Achievement, CompletedAction } from '../types/index.js'

export interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  findByUsername(username: string): Promise<User | null>
  create(user: Omit<User, 'id' | 'joinedAt'> & { id?: string; joinedAt?: string }): Promise<User>
  update(id: string, updates: Partial<Omit<User, 'id' | 'joinedAt'>>): Promise<User | null>
  findAll(): Promise<User[]>
}

export interface IPostRepository {
  findAll(category?: string): Promise<Post[]>
  findById(id: string): Promise<Post | null>
  create(post: Omit<Post, 'id' | 'createdAt' | 'likes' | 'likedByMe' | 'likedByUsers' | 'comments'>): Promise<Post>
  update(id: string, updates: Partial<Post>): Promise<Post | null>
  toggleLike(postId: string, userId: string): Promise<{ post: Post; liked: boolean }>
  addComment(postId: string, comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment | null>
  syncAuthor(authorId: string, authorName: string, authorAvatarUrl: string): Promise<void>
}

export interface IActionRepository {
  findAll(category?: string): Promise<SustainableAction[]>
  findById(id: string): Promise<SustainableAction | null>
}

export interface IProgressRepository {
  getProgress(userId: string): Promise<UserProgress>
  recordCompletedAction(userId: string, action: CompletedAction): Promise<UserProgress>
  incrementPostsCreated(userId: string): Promise<UserProgress>
  unlockAchievements(userId: string, achievementIds: string[]): Promise<UserProgress>
  resetProgress(userId: string): Promise<UserProgress>
  getLevels(): Promise<Level[]>
  getAchievements(): Promise<Achievement[]>
}
