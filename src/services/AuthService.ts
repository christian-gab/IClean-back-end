import { IUserRepository, IPostRepository } from '../repositories/interfaces.js'
import { inMemoryUserRepository } from '../repositories/inMemory/InMemoryUserRepository.js'
import { inMemoryPostRepository } from '../repositories/inMemory/InMemoryPostRepository.js'
import { User } from '../types/index.js'
import { AppError } from '../errors/AppError.js'
import { LoginInput, RegisterInput, UpdateProfileInput } from '../validations/schemas.js'

export class AuthService {
  constructor(
    private userRepo: IUserRepository = inMemoryUserRepository,
    private postRepo: IPostRepository = inMemoryPostRepository
  ) {}

  async login(data: LoginInput): Promise<{ user: User; token: string }> {
    const user = await this.userRepo.findByEmail(data.email.trim().toLowerCase())

    if (!user) {
      throw new AppError('E-mail ou senha incorretos', 401)
    }

    if (user.password && user.password !== data.password) {
      throw new AppError('E-mail ou senha incorretos', 401)
    }

    const token = `token-${Buffer.from(user.id).toString('base64')}-${Date.now()}`

    const { password: _pw, ...safeUser } = user as User & { password?: string }
    return { user: safeUser as User, token }
  }

  async register(data: RegisterInput): Promise<{ user: User; token: string }> {
    const existing = await this.userRepo.findByEmail(data.email.trim().toLowerCase())
    if (existing) {
      throw new AppError('Este e-mail já está cadastrado', 409)
    }

    const avatarSeed = encodeURIComponent(data.name.trim())
    const emailName = data.email.split('@')[0]
    const usernameBase = `@${emailName.replace(/[^a-zA-Z0-9]/g, '.')}`

    const user = await this.userRepo.create({
      name: data.name.trim(),
      username: usernameBase,
      email: data.email.trim().toLowerCase(),
      password: data.password,
      bio: 'Apaixonado(a) por natureza e sustentabilidade. Acredito que pequenas acoes fazem grande diferenca.',
      avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${avatarSeed}&backgroundColor=b6e3f4`,
      joinedAt: new Date().toISOString(),
    })

    const token = `token-${Buffer.from(user.id).toString('base64')}-${Date.now()}`
    const { password: _pw, ...safeUser } = user as User & { password?: string }
    return { user: safeUser as User, token }
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
