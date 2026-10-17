import { IProgressRepository } from '../repositories/interfaces.js'
import { inMemoryProgressRepository } from '../repositories/inMemory/InMemoryProgressRepository.js'
import { UserProgress, Level, Achievement } from '../types/index.js'

export interface AchievementWithStatus extends Achievement {
  unlocked: boolean
}

export class ProgressService {
  constructor(
    private progressRepo: IProgressRepository = inMemoryProgressRepository
  ) {}

  async getUserProgress(userId: string): Promise<UserProgress> {
    return this.progressRepo.getProgress(userId)
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
