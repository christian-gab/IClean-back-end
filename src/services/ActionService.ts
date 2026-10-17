import { IActionRepository, IProgressRepository } from '../repositories/interfaces.js'
import { inMemoryActionRepository } from '../repositories/inMemory/InMemoryActionRepository.js'
import { inMemoryProgressRepository } from '../repositories/inMemory/InMemoryProgressRepository.js'
import { SustainableAction, CompletedAction, UserProgress } from '../types/index.js'
import { AppError } from '../errors/AppError.js'
import { CompleteActionInput } from '../validations/schemas.js'

export interface CompleteActionResult {
  approved: boolean
  message: string
  action: SustainableAction
  completedAction: CompletedAction
  pointsEarned: number
  newTotalPoints: number
  unlockedAchievements: string[]
  levelUp: boolean
  currentLevelName: string
  progress: UserProgress
}

export class ActionService {
  constructor(
    private actionRepo: IActionRepository = inMemoryActionRepository,
    private progressRepo: IProgressRepository = inMemoryProgressRepository
  ) {}

  async listActions(category?: string): Promise<SustainableAction[]> {
    return this.actionRepo.findAll(category)
  }

  async getActionById(id: string): Promise<SustainableAction> {
    const action = await this.actionRepo.findById(id)
    if (!action) {
      throw new AppError('Ação sustentável não encontrada', 404)
    }
    return action
  }

  async completeAction(
    userId: string,
    actionId: string,
    proofData?: CompleteActionInput
  ): Promise<CompleteActionResult> {
    const action = await this.actionRepo.findById(actionId)
    if (!action) {
      throw new AppError('Ação sustentável não encontrada', 404)
    }

    const currentProgress = await this.progressRepo.getProgress(userId)

    // Deduplication check
    if (currentProgress.sessionCompletedActions.includes(actionId)) {
      throw new AppError('Esta ação já foi registrada nesta sessão.', 400)
    }

    const previousLevelName = currentProgress.currentLevel.name

    const completedAction: CompletedAction = {
      id: `ca-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actionId: action.id,
      actionTitle: action.title,
      points: action.points,
      completedAt: new Date().toISOString(),
      photoUrl: proofData?.photoUrl,
      description: proofData?.description,
    }

    let progress = await this.progressRepo.recordCompletedAction(userId, completedAction)

    // Check achievement unlock
    const newAchievements: string[] = []
    if (progress.actionsCompleted >= 1 && !progress.unlockedAchievements.includes('ach-first-action')) {
      newAchievements.push('ach-first-action')
    }
    if (progress.actionsCompleted >= 5 && !progress.unlockedAchievements.includes('ach-5-actions')) {
      newAchievements.push('ach-5-actions')
    }
    if (progress.actionsCompleted >= 10 && !progress.unlockedAchievements.includes('ach-10-actions')) {
      newAchievements.push('ach-10-actions')
    }

    if (newAchievements.length > 0) {
      progress = await this.progressRepo.unlockAchievements(userId, newAchievements)
    }

    const levelUp = progress.currentLevel.name !== previousLevelName

    return {
      approved: true,
      message: levelUp
        ? `Parabéns! Você alcançou o nível ${progress.currentLevel.name}!`
        : `Ação validada com sucesso! +${action.points} pontos ganhos.`,
      action,
      completedAction,
      pointsEarned: action.points,
      newTotalPoints: progress.totalPoints,
      unlockedAchievements: newAchievements,
      levelUp,
      currentLevelName: progress.currentLevel.name,
      progress,
    }
  }
}

export const actionService = new ActionService()
