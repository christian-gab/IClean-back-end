import { Pool, RowDataPacket } from 'mysql2/promise'
import { PostCategory, SustainableAction } from '../../types/index.js'
import { IActionRepository } from '../interfaces.js'

interface ActionRow extends RowDataPacket {
  id: string
  title: string
  description: string
  category: PostCategory
  points: number
  icon: string
}

function toAction(row: ActionRow): SustainableAction {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    points: row.points,
    icon: row.icon,
  }
}

export class MySqlActionRepository implements IActionRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(category?: string): Promise<SustainableAction[]> {
    const [rows] = category && category !== 'all'
      ? await this.pool.query<ActionRow[]>(
          `SELECT id, title, description, category, points, icon
           FROM sustainable_actions WHERE category = ? ORDER BY id`,
          [category]
        )
      : await this.pool.query<ActionRow[]>(
          `SELECT id, title, description, category, points, icon
           FROM sustainable_actions ORDER BY id`
        )
    return rows.map(toAction)
  }

  async findById(id: string): Promise<SustainableAction | null> {
    const [rows] = await this.pool.query<ActionRow[]>(
      `SELECT id, title, description, category, points, icon
       FROM sustainable_actions WHERE id = ? LIMIT 1`,
      [id]
    )
    return rows[0] ? toAction(rows[0]) : null
  }
}
