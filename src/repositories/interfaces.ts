import { User, StoredUser, Post, Comment, SustainableAction, UserProgress, Level, Achievement, CompletedAction } from '../types/index.js'

export interface IUserRepository {
  findById(id: string): Promise<StoredUser | null>
  findByEmail(email: string): Promise<StoredUser | null>
  findByUsername(username: string): Promise<StoredUser | null>
  create(user: Omit<StoredUser, 'id' | 'joinedAt' | 'passwordHash'> & { passwordHash: string; id?: string; joinedAt?: string }): Promise<StoredUser>
  update(id: string, updates: Partial<Omit<User, 'id' | 'joinedAt'>>): Promise<StoredUser | null>
  findAll(): Promise<StoredUser[]>
}

export interface IPostRepository {
  findAll(category?: string): Promise<Post[]>
  findById(id: string): Promise<Post | null>
  findByAuthor(authorId: string): Promise<Post[]>
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
  getAllProgressTotals(): Promise<Array<{ userId: string; totalPoints: number }>>
  recordCompletedAction(userId: string, action: CompletedAction): Promise<UserProgress>
  incrementPostsCreated(userId: string): Promise<UserProgress>
  unlockAchievements(userId: string, achievementIds: string[]): Promise<UserProgress>
  resetProgress(userId: string): Promise<UserProgress>
  getLevels(): Promise<Level[]>
  getAchievements(): Promise<Achievement[]>
}
