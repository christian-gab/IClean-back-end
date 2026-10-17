import { User } from '../../types/index.js'
import { IUserRepository } from '../interfaces.js'
import { initialUsers } from '../../data/seed.js'

export class InMemoryUserRepository implements IUserRepository {
  private users: User[] = [...initialUsers]

  async findById(id: string): Promise<User | null> {
    const user = this.users.find(u => u.id === id)
    return user ? { ...user } : null
  }

  async findByUsername(username: string): Promise<User | null> {
    const clean = username.trim().toLowerCase()
    const user = this.users.find(u => u.username.toLowerCase() === clean)
    return user ? { ...user } : null
  }

  async create(data: Omit<User, 'id' | 'joinedAt'> & { id?: string; joinedAt?: string }): Promise<User> {
    const newUser: User = {
      id: data.id || `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: data.name,
      username: data.username,
      bio: data.bio,
      avatarUrl: data.avatarUrl,
      joinedAt: data.joinedAt || new Date().toISOString(),
    }
    this.users.push(newUser)
    return { ...newUser }
  }

  async update(id: string, updates: Partial<Omit<User, 'id' | 'joinedAt'>>): Promise<User | null> {
    const index = this.users.findIndex(u => u.id === id)
    if (index === -1) return null

    this.users[index] = {
      ...this.users[index],
      ...updates,
    }
    return { ...this.users[index] }
  }

  async findAll(): Promise<User[]> {
    return this.users.map(u => ({ ...u }))
  }
}

export const inMemoryUserRepository = new InMemoryUserRepository()
