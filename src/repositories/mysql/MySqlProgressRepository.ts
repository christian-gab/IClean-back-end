import { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import {
  Achievement,
  CompletedAction,
  Level,
  UserProgress,
} from '../../types/index.js'
import { AppError } from '../../errors/AppError.js'
import { allAchievements, levels } from '../../data/seed.js'
import { IProgressRepository } from '../interfaces.js'

interface ProgressRow extends RowDataPacket {
  total_points: number
  actions_completed: number
  posts_created: number
}

interface ProgressTotalRow extends RowDataPacket {
  user_id: string
  total_points: number
}

interface IdRow extends RowDataPacket {
  id: string
}

interface AchievementIdRow extends RowDataPacket {
  achievement_id: string
}

interface ActionHistoryRow extends RowDataPacket {
  id: string
  action_id: string
  action_title: string | null
  fallback_action_title: string | null
  points_earned: number
  completed_at: Date | string
  photo_url: string | null
  description: string | null
}

interface LevelRow extends RowDataPacket {
  name: string
  min_points: number
  max_points: number
  icon: string
  color: string
}

interface AchievementRow extends RowDataPacket {
  id: string
  title: string
  description: string
  icon: string
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function toLevel(row: LevelRow): Level {
  return {
    name: row.name,
    minPoints: row.min_points,
    maxPoints: row.max_points,
    icon: row.icon,
    color: row.color,
  }
}

function toAchievement(row: AchievementRow): Achievement {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
  }
}

function toCompletedAction(row: ActionHistoryRow): CompletedAction {
  return {
    id: row.id,
    actionId: row.action_id,
    actionTitle: row.action_title ?? row.fallback_action_title ?? row.action_id,
    points: row.points_earned,
    completedAt: toIso(row.completed_at),
    photoUrl: row.photo_url ?? undefined,
    description: row.description ?? undefined,
  }
}

export class MySqlProgressRepository implements IProgressRepository {
  private readonly sessionCompletedActions = new Map<string, Set<string>>()

  constructor(private readonly pool: Pool) {}

  private async ensureProgress(connection: Pool | PoolConnection, userId: string): Promise<void> {
    await connection.execute(
      'INSERT IGNORE INTO user_progress (user_id) VALUES (?)',
      [userId]
    )
  }

  private getSessionActions(userId: string): string[] {
    return [...(this.sessionCompletedActions.get(userId) ?? [])]
  }

  private getLevelForPoints(points: number): Level {
    return levels.slice().reverse().find(level => points >= level.minPoints) ?? levels[0]
  }

  private getNextLevel(points: number): Level | null {
    const current = this.getLevelForPoints(points)
    const index = levels.findIndex(level => level.name === current.name)
    return index < levels.length - 1 ? levels[index + 1] : null
  }

  private getLevelProgress(points: number): number {
    const current = this.getLevelForPoints(points)
    const next = this.getNextLevel(points)
    if (!next) return 100
    return Math.min(
      100,
      Math.round(((points - current.minPoints) / (next.minPoints - current.minPoints)) * 100)
    )
  }

  async getProgress(userId: string): Promise<UserProgress> {
    await this.ensureProgress(this.pool, userId)
    const [progressRows] = await this.pool.query<ProgressRow[]>(
      `SELECT total_points, actions_completed, posts_created
       FROM user_progress WHERE user_id = ? LIMIT 1`,
      [userId]
    )
    const [achievementRows] = await this.pool.query<AchievementIdRow[]>(
      `SELECT achievement_id FROM user_achievements WHERE user_id = ? ORDER BY unlocked_at`,
      [userId]
    )
    const [historyRows] = await this.pool.query<ActionHistoryRow[]>(
      `SELECT completed.id, completed.action_id, completed.action_title,
              actions.title AS fallback_action_title, completed.points_earned,
              completed.completed_at, completed.photo_url, completed.description
       FROM user_completed_actions completed
       LEFT JOIN sustainable_actions actions ON actions.id = completed.action_id
       WHERE completed.user_id = ?
       ORDER BY completed.completed_at DESC, completed.id DESC`,
      [userId]
    )

    const raw = progressRows[0]
    if (!raw) throw new Error('Progresso do usuário não pôde ser carregado do MySQL')
    const currentLevel = this.getLevelForPoints(raw.total_points)

    return {
      userId,
      totalPoints: raw.total_points,
      actionsCompleted: raw.actions_completed,
      postsCreated: raw.posts_created,
      unlockedAchievements: achievementRows.map(row => row.achievement_id),
      history: historyRows.map(toCompletedAction),
      sessionCompletedActions: this.getSessionActions(userId),
      currentLevel,
      nextLevel: this.getNextLevel(raw.total_points),
      levelProgress: this.getLevelProgress(raw.total_points),
    }
  }

  async getAllProgressTotals(): Promise<Array<{ userId: string; totalPoints: number }>> {
    const [rows] = await this.pool.query<ProgressTotalRow[]>(
      'SELECT user_id, total_points FROM user_progress'
    )
    return rows.map(row => ({ userId: row.user_id, totalPoints: row.total_points }))
  }

  async recordCompletedAction(userId: string, action: CompletedAction): Promise<UserProgress> {
    const completed = this.sessionCompletedActions.get(userId) ?? new Set<string>()
    if (completed.has(action.actionId)) {
      throw new AppError('Esta ação já foi registrada nesta sessão.', 400)
    }
    completed.add(action.actionId)
    this.sessionCompletedActions.set(userId, completed)

    let connection: PoolConnection | undefined
    try {
      connection = await this.pool.getConnection()
      await connection.beginTransaction()
      await this.ensureProgress(connection, userId)
      await connection.execute(
        `INSERT INTO user_completed_actions
         (id, user_id, action_id, action_title, points_earned, photo_url, description, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          action.id,
          userId,
          action.actionId,
          action.actionTitle,
          action.points,
          action.photoUrl ?? null,
          action.description ?? null,
          new Date(action.completedAt),
        ]
      )
      await connection.execute(
        `UPDATE user_progress
         SET total_points = total_points + ?, actions_completed = actions_completed + 1
         WHERE user_id = ?`,
        [action.points, userId]
      )
      await connection.commit()
    } catch (error) {
      completed.delete(action.actionId)
      if (connection) {
        try {
          await connection.rollback()
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            'Falha ao registrar ação e reverter a transação MySQL'
          )
        }
      }
      throw error
    } finally {
      connection?.release()
    }
    return this.getProgress(userId)
  }

  async incrementPostsCreated(userId: string): Promise<UserProgress> {
    await this.ensureProgress(this.pool, userId)
    await this.pool.execute<ResultSetHeader>(
      'UPDATE user_progress SET posts_created = posts_created + 1 WHERE user_id = ?',
      [userId]
    )
    return this.getProgress(userId)
  }

  async unlockAchievements(userId: string, achievementIds: string[]): Promise<UserProgress> {
    for (const achievementId of achievementIds) {
      await this.pool.execute(
        `INSERT IGNORE INTO user_achievements (user_id, achievement_id)
         VALUES (?, ?)`,
        [userId, achievementId]
      )
    }
    return this.getProgress(userId)
  }

  async resetProgress(userId: string): Promise<UserProgress> {
    const connection = await this.pool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.execute(
        'DELETE FROM user_completed_actions WHERE user_id = ?',
        [userId]
      )
      await connection.execute(
        'DELETE FROM user_achievements WHERE user_id = ?',
        [userId]
      )
      await connection.execute(
        `INSERT INTO user_progress (user_id, total_points, actions_completed, posts_created)
         VALUES (?, 0, 0, 0)
         ON DUPLICATE KEY UPDATE total_points = 0, actions_completed = 0, posts_created = 0`,
        [userId]
      )
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
    this.sessionCompletedActions.delete(userId)
    return this.getProgress(userId)
  }

  async getLevels(): Promise<Level[]> {
    const [rows] = await this.pool.query<LevelRow[]>(
      `SELECT name, min_points, max_points, icon, color
       FROM levels ORDER BY min_points`
    )
    return rows.map(toLevel)
  }

  async getAchievements(): Promise<Achievement[]> {
    const [rows] = await this.pool.query<AchievementRow[]>(
      `SELECT id, title, description, icon FROM achievements ORDER BY id`
    )
    return rows.map(toAchievement)
  }
}
