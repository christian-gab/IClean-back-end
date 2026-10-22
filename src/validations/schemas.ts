import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
})

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'O nome deve ter no mínimo 2 caracteres'),
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
})

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'O nome não pode ser vazio').optional(),
  bio: z.string().max(500, 'A bio não pode exceder 500 caracteres').optional(),
  avatarUrl: z.string().url('URL de avatar inválida').or(z.string().startsWith('data:image/')).optional(),
})

export const createPostSchema = z.object({
  text: z.string().trim().min(10, 'A publicação deve ter no mínimo 10 caracteres').max(1000, 'A publicação deve ter no máximo 1000 caracteres'),
  category: z.enum(['recycling', 'water', 'plastic', 'consumption', 'preservation', 'other'], {
    errorMap: () => ({ message: 'Categoria inválida' }),
  }),
  imageUrl: z.string().url('URL de imagem inválida').or(z.string().startsWith('data:image/')).optional(),
})

export const createCommentSchema = z.object({
  text: z.string().trim().min(1, 'O comentário não pode ser vazio').max(500, 'O comentário não pode exceder 500 caracteres'),
})

export const completeActionSchema = z.object({
  photoUrl: z.string().optional(),
  description: z.string().max(500, 'Descrição não pode exceder 500 caracteres').optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type CreatePostInput = z.infer<typeof createPostSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type CompleteActionInput = z.infer<typeof completeActionSchema>
