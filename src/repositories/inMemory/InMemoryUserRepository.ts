import { User, StoredUser } from '../../types/index.js'
import { IUserRepository } from '../interfaces.js'
import { initialUsers } from '../../data/seed.js'
import { AppError } from '../../errors/AppError.js'
import { randomUUID } from 'node:crypto'

export class InMemoryUserRepository implements IUserRepository {
  private users: StoredUser[] = [...initialUsers]

  async findById(id: string): Promise<StoredUser | null> {
    const user = this.users.find(u => u.id === id)
    return user ? { ...user } : null
  }

  async findByEmail(email: string): Promise<StoredUser | null> {
    const clean = email.trim().toLowerCase()
    const user = this.users.find(u => u.email?.toLowerCase() === clean)
    return user ? { ...user } : null
  }

  async findByUsername(username: string): Promise<StoredUser | null> {
    const clean = username.trim().toLowerCase()
    const user = this.users.find(u => u.username.toLowerCase() === clean)
    return user ? { ...user } : null
  }

  async create(data: Omit<StoredUser, 'id' | 'joinedAt' | 'passwordHash'> & { passwordHash: string; id?: string; joinedAt?: string }): Promise<StoredUser> {
    const email = data.email.trim().toLowerCase()
    if (this.users.some(user => user.email.trim().toLowerCase() === email)) {
      throw new AppError('Este e-mail já está cadastrado', 409)
    }

    const username = data.username.trim()
    if (this.users.some(user => user.username.trim().toLowerCase() === username.toLowerCase())) {
      throw new AppError('Este nome de usuário já está cadastrado', 409)
    }

    const newUser: StoredUser = {
      id: data.id || randomUUID(),
      name: data.name,
      username,
      email,
      passwordHash: data.passwordHash,
      bio: data.bio,
      avatarUrl: data.avatarUrl,
      joinedAt: data.joinedAt || new Date().toISOString(),
    }
    this.users.push(newUser)
    return { ...newUser }
  }

  async update(id: string, updates: Partial<Omit<User, 'id' | 'joinedAt'>>): Promise<StoredUser | null> {
    const index = this.users.findIndex(u => u.id === id)
    if (index === -1) return null

    this.users[index] = {
      ...this.users[index],
      ...updates,
    }
    return { ...this.users[index] }
  }

  async findAll(): Promise<StoredUser[]> {
    return this.users.map(u => ({ ...u }))
  }
}

export const inMemoryUserRepository = new InMemoryUserRepository()
