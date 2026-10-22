import { Router } from 'express'
import { authController } from '../controllers/AuthController.js'
import { validate } from '../middlewares/validate.js'
import { loginSchema, registerSchema } from '../validations/schemas.js'

const router = Router()

router.post('/login', validate(loginSchema), authController.login.bind(authController))
router.post('/register', validate(registerSchema), authController.register.bind(authController))
router.get('/me', authController.me.bind(authController))

export const authRoutes = router
