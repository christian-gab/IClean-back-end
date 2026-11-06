import { IProgressRepository, IUserRepository } from '../repositories/interfaces.js'
import { progressRepository, userRepository } from '../repositories/index.js'
import { UserProgress, Level, Achievement } from '../types/index.js'

export interface AchievementWithStatus extends Achievement {
  unlocked: boolean
}

export interface LeaderboardEntry {
  id: string
  name: string
  username: string
  avatarUrl: string
  totalPoints: number
  rank: number
}

export class ProgressService {
  constructor(
    private progressRepo: IProgressRepository = progressRepository,
    private userRepo: IUserRepository = userRepository
  ) {}

  async getUserProgress(userId: string): Promise<UserProgress> {
    return this.progressRepo.getProgress(userId)
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const [users, progressTotals] = await Promise.all([
      this.userRepo.findAll(),
      this.progressRepo.getAllProgressTotals(),
    ])
    const pointsByUserId = new Map(progressTotals.map(({ userId, totalPoints }) => [userId, totalPoints]))

    return users
      .map(({ id, name, username, avatarUrl }) => ({
        id,
        name,
        username,
        avatarUrl,
        totalPoints: pointsByUserId.get(id) ?? 0,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name))
      .map((user, index) => ({ ...user, rank: index + 1 }))
  }

  async getLevels(): Promise<Level[]> {
    return this.progressRepo.getLevels()
  }

  async getAchievements(userId?: string): Promise<AchievementWithStatus[]> {
    const achievements = await this.progressRepo.getAchievements()
    if (!userId) {
      return achievements.map(a => ({ ...a, unlocked: false }))
    }

    const progress = await this.progressRepo.getProgress(userId)
    return achievements.map(a => ({
      ...a,
      unlocked: progress.unlockedAchievements.includes(a.id),
    }))
  }

  async resetProgress(userId: string): Promise<UserProgress> {
    return this.progressRepo.resetProgress(userId)
  }
}

export const progressService = new ProgressService()
