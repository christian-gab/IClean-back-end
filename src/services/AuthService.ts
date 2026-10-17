import { IUserRepository, IPostRepository } from '../repositories/interfaces.js'
import { inMemoryUserRepository } from '../repositories/inMemory/InMemoryUserRepository.js'
import { inMemoryPostRepository } from '../repositories/inMemory/InMemoryPostRepository.js'
import { User } from '../types/index.js'
import { AppError } from '../errors/AppError.js'
import { LoginInput, UpdateProfileInput } from '../validations/schemas.js'

export class AuthService {
  constructor(
    private userRepo: IUserRepository = inMemoryUserRepository,
    private postRepo: IPostRepository = inMemoryPostRepository
  ) {}

  async login(data: LoginInput): Promise<{ user: User; token: string }> {
    const formattedUsername = data.username.trim().startsWith('@')
      ? data.username.trim()
      : `@${data.username.trim()}`

    let user = await this.userRepo.findByUsername(formattedUsername)

    if (!user) {
      const avatarSeed = encodeURIComponent(data.name.trim())
      user = await this.userRepo.create({
        name: data.name.trim(),
        username: formattedUsername,
        bio: 'Apaixonado(a) por natureza e sustentabilidade. Acredito que pequenas acoes fazem grande diferenca.',
        avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${avatarSeed}&backgroundColor=b6e3f4`,
        joinedAt: new Date().toISOString(),
      })
    }

    // Generate lightweight mock JWT/session token
    const token = `token-${Buffer.from(user.id).toString('base64')}-${Date.now()}`

    return { user, token }
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id)
    if (!user) {
      throw new AppError('Usuário não encontrado', 404)
    }
    return user
  }

  async updateProfile(id: string, updates: UpdateProfileInput): Promise<User> {
    const user = await this.userRepo.findById(id)
    if (!user) {
      throw new AppError('Usuário não encontrado', 404)
    }

    const updatedUser = await this.userRepo.update(id, updates)
    if (!updatedUser) {
      throw new AppError('Falha ao atualizar perfil', 500)
    }

    // Sync author info in posts and comments
    if (updates.name || updates.avatarUrl) {
      await this.postRepo.syncAuthor(
        id,
        updatedUser.name,
        updatedUser.avatarUrl
      )
    }

    return updatedUser
  }
}

export const authService = new AuthService()
