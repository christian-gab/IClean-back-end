import { Router } from 'express'
import { userController } from '../controllers/UserController.js'
import { authController } from '../controllers/AuthController.js'
import { validate } from '../middlewares/validate.js'
import { updateProfileSchema } from '../validations/schemas.js'

const router = Router()

router.get('/me', authController.me.bind(authController))
router.get('/:id/posts', userController.getUserPosts.bind(userController))
router.get('/:id', userController.getUser.bind(userController))
router.put('/:id', validate(updateProfileSchema), userController.updateProfile.bind(userController))
router.patch('/:id', validate(updateProfileSchema), userController.updateProfile.bind(userController))

export const userRoutes = router
