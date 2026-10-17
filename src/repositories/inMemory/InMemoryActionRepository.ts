import { SustainableAction } from '../../types/index.js'
import { IActionRepository } from '../interfaces.js'
import { sustainableActions } from '../../data/seed.js'

export class InMemoryActionRepository implements IActionRepository {
  private actions: SustainableAction[] = [...sustainableActions]

  async findAll(category?: string): Promise<SustainableAction[]> {
    if (!category || category === 'all') {
      return this.actions.map(a => ({ ...a }))
    }
    return this.actions.filter(a => a.category === category).map(a => ({ ...a }))
  }

  async findById(id: string): Promise<SustainableAction | null> {
    const action = this.actions.find(a => a.id === id)
    return action ? { ...action } : null
  }
}

export const inMemoryActionRepository = new InMemoryActionRepository()
