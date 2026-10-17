export type PostCategory =
  | 'recycling'
  | 'water'
  | 'plastic'
  | 'consumption'
  | 'preservation'
  | 'other'

export interface User {
  id: string
  name: string
  username: string
  bio: string
  avatarUrl: string
  joinedAt: string
}

export interface Comment {
  id: string
  authorId: string
  authorName: string
  authorAvatarUrl: string
  text: string
  createdAt: string
}

export interface Post {
  id: string
  authorId: string
  authorName: string
  authorAvatarUrl: string
  text: string
  imageUrl?: string
  category: PostCategory
  likes: number
  likedByMe: boolean
  likedByUsers: string[]
  comments: Comment[]
  createdAt: string
}

export interface SustainableAction {
  id: string
  title: string
  description: string
  category: PostCategory
  points: number
  icon: string
}

export interface CompletedAction {
  id: string
  actionId: string
  actionTitle: string
  points: number
  completedAt: string
  photoUrl?: string
  description?: string
}

export interface Level {
  name: string
  minPoints: number
  maxPoints: number
  icon: string
  color: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt?: string
}

export interface UserProgress {
  userId: string
  totalPoints: number
  actionsCompleted: number
  postsCreated: number
  unlockedAchievements: string[]
  history: CompletedAction[]
  sessionCompletedActions: string[]
  currentLevel: Level
  nextLevel: Level | null
  levelProgress: number
}
