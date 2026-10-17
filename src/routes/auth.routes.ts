import { Router } from 'express'
import { authController } from '../controllers/AuthController.js'
import { validate } from '../middlewares/validate.js'
import { loginSchema } from '../validations/schemas.js'

const router = Router()

router.post('/login', validate(loginSchema), authController.login.bind(authController))
router.get('/me', authController.me.bind(authController))

export const authRoutes = router
