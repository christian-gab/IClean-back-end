import { Router } from 'express'
import { authController } from '../controllers/AuthController.js'
import { validate } from '../middlewares/validate.js'
import { loginSchema, registerSchema, sendVerificationSchema, verifyEmailSchema } from '../validations/schemas.js'

const router = Router()

router.post('/login', validate(loginSchema), authController.login.bind(authController))
router.post('/register', validate(registerSchema), authController.register.bind(authController))

// Verificação de email em dois passos
router.post('/send-verification', validate(sendVerificationSchema), authController.sendVerification.bind(authController))
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyAndRegister.bind(authController))

router.get('/me', authController.me.bind(authController))

export const authRoutes = router
