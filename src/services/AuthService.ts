import { IUserRepository, IPostRepository } from '../repositories/interfaces.js'
import { postRepository, userRepository } from '../repositories/index.js'
import { PublicUser, StoredUser, User } from '../types/index.js'
import { AppError } from '../errors/AppError.js'
import { LoginInput, RegisterInput, SendVerificationInput, VerifyEmailInput, UpdateProfileInput } from '../validations/schemas.js'
import { createAuthToken } from '../utils/auth.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { verificationStore } from './VerificationStore.js'
import { generateCode, sendVerificationEmail } from './EmailService.js'

export class AuthService {
  constructor(
    private userRepo: IUserRepository = userRepository,
    private postRepo: IPostRepository = postRepository
  ) {}

  private sanitizeUser(user: StoredUser): User {
    const { passwordHash: _passwordHash, ...safeUser } = user
    return safeUser
  }

  async login(data: LoginInput): Promise<{ user: User; token: string }> {
    const user = await this.userRepo.findByEmail(data.email.trim().toLowerCase())
    const passwordMatches = await verifyPassword(data.password, user?.passwordHash)
    if (!user || !passwordMatches) {
      throw new AppError('E-mail ou senha incorretos', 401)
    }

    return { user: this.sanitizeUser(user), token: createAuthToken(user.id) }
  }

  async sendVerification(data: SendVerificationInput): Promise<void> {
    const cleanEmail = data.email.trim().toLowerCase()

    // Rejeita se o email já está cadastrado
    const existing = await this.userRepo.findByEmail(cleanEmail)
    if (existing) {
      throw new AppError('Este e-mail já está cadastrado', 409)
    }

    const code = generateCode()
    verificationStore.set(cleanEmail, code)
    await sendVerificationEmail(cleanEmail, code)
  }

  async verifyAndRegister(data: VerifyEmailInput): Promise<{ user: User; token: string }> {
    const cleanEmail = data.email.trim().toLowerCase()

    const result = verificationStore.verify(cleanEmail, data.code)
    if (result === 'expired') {
      throw new AppError('Código expirado. Solicite um novo código.', 400)
    }
    if (result === 'too_many_attempts') {
      throw new AppError('Muitas tentativas incorretas. Solicite um novo código.', 429)
    }
    if (result === 'invalid') {
      throw new AppError('Código incorreto. Tente novamente.', 400)
    }

    // Código válido — prossegue com o registro
    return this.register({ name: data.name, email: data.email, password: data.password })
  }

  async register(data: RegisterInput): Promise<{ user: User; token: string }> {
    const cleanEmail = data.email.trim().toLowerCase()
    const existing = await this.userRepo.findByEmail(cleanEmail)
    if (existing) {
      throw new AppError('Este e-mail já está cadastrado', 409)
    }

    const avatarSeed = encodeURIComponent(data.name.trim())
    const emailName = cleanEmail.split('@')[0]
    const usernameBase = emailName.replace(/[^a-zA-Z0-9]/g, '.').replace(/^\.+|\.+$/g, '') || 'user'

    let counter = 0
    let finalUsername: string
    do {
      const suffix = counter === 0 ? '' : String(counter)
      finalUsername = `@${usernameBase.slice(0, 59 - suffix.length)}${suffix}`
      counter += 1
    } while (await this.userRepo.findByUsername(finalUsername))

    const passwordHash = await hashPassword(data.password)
    const user = await this.userRepo.create({
      name: data.name.trim(),
      username: finalUsername,
      email: cleanEmail,
      passwordHash,
      bio: 'Apaixonado(a) por natureza e sustentabilidade. Acredito que pequenas acoes fazem grande diferenca.',
      avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${avatarSeed}&backgroundColor=b6e3f4`,
      joinedAt: new Date().toISOString(),
    })

    return { user: this.sanitizeUser(user), token: createAuthToken(user.id) }
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id)
    if (!user) {
      throw new AppError('Usuário não encontrado', 404)
    }
    return this.sanitizeUser(user)
  }

  async getPublicUserById(id: string): Promise<PublicUser> {
    const user = await this.getUserById(id)
    const { email: _email, ...publicUser } = user
    return publicUser
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

    return this.sanitizeUser(updatedUser)
  }
}

export const authService = new AuthService()
