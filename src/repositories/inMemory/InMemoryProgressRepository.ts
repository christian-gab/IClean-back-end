import { UserProgress, CompletedAction, Level, Achievement } from '../../types/index.js'
import { IProgressRepository } from '../interfaces.js'
import { levels, allAchievements } from '../../data/seed.js'

export class InMemoryProgressRepository implements IProgressRepository {
  private userProgressMap: Map<string, {
    totalPoints: number
    actionsCompleted: number
    postsCreated: number
    unlockedAchievements: string[]
    history: CompletedAction[]
    sessionCompletedActions: string[]
  }> = new Map()

  private getLevelForPoints(points: number): Level {
    return levels.slice().reverse().find(l => points >= l.minPoints) ?? levels[0]
  }

  private getNextLevel(points: number): Level | null {
    const current = this.getLevelForPoints(points)
    const idx = levels.findIndex(l => l.name === current.name)
    return idx < levels.length - 1 ? levels[idx + 1] : null
  }

  private getLevelProgress(points: number): number {
    const current = this.getLevelForPoints(points)
    const next = this.getNextLevel(points)
    if (!next) return 100
    const range = next.minPoints - current.minPoints
    const earned = points - current.minPoints
    return Math.min(100, Math.round((earned / range) * 100))
  }

  private getOrCreateRawProgress(userId: string) {
    if (!this.userProgressMap.has(userId)) {
      this.userProgressMap.set(userId, {
        totalPoints: 0,
        actionsCompleted: 0,
        postsCreated: 0,
        unlockedAchievements: [],
        history: [],
        sessionCompletedActions: [],
      })
    }
    return this.userProgressMap.get(userId)!
  }

  async getProgress(userId: string): Promise<UserProgress> {
    const raw = this.getOrCreateRawProgress(userId)
    const currentLevel = this.getLevelForPoints(raw.totalPoints)
    const nextLevel = this.getNextLevel(raw.totalPoints)
    const levelProgress = this.getLevelProgress(raw.totalPoints)

    return {
      userId,
      totalPoints: raw.totalPoints,
      actionsCompleted: raw.actionsCompleted,
      postsCreated: raw.postsCreated,
      unlockedAchievements: [...raw.unlockedAchievements],
      history: [...raw.history],
      sessionCompletedActions: [...raw.sessionCompletedActions],
      currentLevel,
      nextLevel,
      levelProgress,
    }
  }

  async recordCompletedAction(userId: string, action: CompletedAction): Promise<UserProgress> {
    const raw = this.getOrCreateRawProgress(userId)
    raw.totalPoints += action.points
    raw.actionsCompleted += 1
    raw.history.unshift(action)
    if (!raw.sessionCompletedActions.includes(action.actionId)) {
      raw.sessionCompletedActions.push(action.actionId)
    }

    return this.getProgress(userId)
  }

  async incrementPostsCreated(userId: string): Promise<UserProgress> {
    const raw = this.getOrCreateRawProgress(userId)
    raw.postsCreated += 1
    return this.getProgress(userId)
  }

  async unlockAchievements(userId: string, achievementIds: string[]): Promise<UserProgress> {
    const raw = this.getOrCreateRawProgress(userId)
    for (const id of achievementIds) {
      if (!raw.unlockedAchievements.includes(id)) {
        raw.unlockedAchievements.push(id)
      }
    }
    return this.getProgress(userId)
  }

  async resetProgress(userId: string): Promise<UserProgress> {
    this.userProgressMap.set(userId, {
      totalPoints: 0,
      actionsCompleted: 0,
      postsCreated: 0,
      unlockedAchievements: [],
      history: [],
      sessionCompletedActions: [],
    })
    return this.getProgress(userId)
  }

  async getLevels(): Promise<Level[]> {
    return [...levels]
  }

  async getAchievements(): Promise<Achievement[]> {
    return [...allAchievements]
  }
}

export const inMemoryProgressRepository = new InMemoryProgressRepository()
