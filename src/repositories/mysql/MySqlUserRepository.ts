import { randomUUID } from 'node:crypto'
import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { AppError } from '../../errors/AppError.js'
import { StoredUser, User } from '../../types/index.js'
import { IUserRepository } from '../interfaces.js'

interface UserRow extends RowDataPacket {
  id: string
  name: string
  username: string
  email: string
  password_hash: string | null
  bio: string | null
  avatar_url: string | null
  created_at: Date | string
}

function toStoredUser(row: UserRow): StoredUser {
  const createdAt = row.created_at instanceof Date
    ? row.created_at.toISOString()
    : new Date(row.created_at).toISOString()

  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    bio: row.bio ?? '',
    avatarUrl: row.avatar_url ?? '',
    joinedAt: createdAt,
  }
}

function isDuplicateEntry(error: unknown): boolean {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ER_DUP_ENTRY'
}

export class MySqlUserRepository implements IUserRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<StoredUser | null> {
    const [rows] = await this.pool.query<UserRow[]>(
      `SELECT id, name, username, email, password_hash, bio, avatar_url, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [id]
    )
    return rows[0] ? toStoredUser(rows[0]) : null
  }

  async findByEmail(email: string): Promise<StoredUser | null> {
    const normalizedEmail = email.trim().toLowerCase()
    const [rows] = await this.pool.query<UserRow[]>(
      `SELECT id, name, username, email, password_hash, bio, avatar_url, created_at
       FROM users WHERE email_normalized = ? LIMIT 1`,
      [normalizedEmail]
    )
    return rows[0] ? toStoredUser(rows[0]) : null
  }

  async findByUsername(username: string): Promise<StoredUser | null> {
    const normalizedUsername = username.trim().toLowerCase()
    const [rows] = await this.pool.query<UserRow[]>(
      `SELECT id, name, username, email, password_hash, bio, avatar_url, created_at
       FROM users WHERE LOWER(TRIM(username)) = ? LIMIT 1`,
      [normalizedUsername]
    )
    return rows[0] ? toStoredUser(rows[0]) : null
  }

  async create(
    data: Omit<StoredUser, 'id' | 'joinedAt' | 'passwordHash'> & {
      passwordHash: string
      id?: string
      joinedAt?: string
    }
  ): Promise<StoredUser> {
    const id = data.id || randomUUID()
    const email = data.email.trim().toLowerCase()
    const username = data.username.trim()
    const joinedAt = data.joinedAt || new Date().toISOString()

    try {
      await this.pool.execute<ResultSetHeader>(
        `INSERT INTO users
         (id, name, username, email, password_hash, bio, avatar_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.name,
          username,
          email,
          data.passwordHash,
          data.bio,
          data.avatarUrl,
          new Date(joinedAt),
        ]
      )
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new AppError('E-mail ou nome de usuário já cadastrado', 409)
      }
      throw error
    }

    const user = await this.findById(id)
    if (!user) {
      throw new Error('Usuário criado no MySQL não pôde ser carregado')
    }
    return user
  }

  async update(
    id: string,
    updates: Partial<Omit<User, 'id' | 'joinedAt'>>
  ): Promise<StoredUser | null> {
    const columns: Partial<Record<keyof Omit<User, 'id' | 'joinedAt'>, string>> = {
      name: 'name',
      username: 'username',
      email: 'email',
      bio: 'bio',
      avatarUrl: 'avatar_url',
    }
    const assignments: string[] = []
    const values: string[] = []

    for (const [field, column] of Object.entries(columns)) {
      const value = updates[field as keyof typeof columns]
      if (value !== undefined) {
        assignments.push(`\`${column}\` = ?`)
        values.push(field === 'email' ? value.trim().toLowerCase() : value)
      }
    }

    if (assignments.length === 0) {
      return this.findById(id)
    }

    try {
      await this.pool.execute<ResultSetHeader>(
        `UPDATE users SET ${assignments.join(', ')} WHERE id = ?`,
        [...values, id]
      )
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new AppError('E-mail ou nome de usuário já cadastrado', 409)
      }
      throw error
    }
    return this.findById(id)
  }

  async findAll(): Promise<StoredUser[]> {
    const [rows] = await this.pool.query<UserRow[]>(
      `SELECT id, name, username, email, password_hash, bio, avatar_url, created_at
       FROM users ORDER BY created_at ASC`
    )
    return rows.map(toStoredUser)
  }
}
