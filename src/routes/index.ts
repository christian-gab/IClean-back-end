import { Router } from 'express'
import { authRoutes } from './auth.routes.js'
import { userRoutes } from './user.routes.js'
import { postRoutes } from './post.routes.js'
import { actionRoutes } from './action.routes.js'
import { progressRoutes } from './progress.routes.js'
import { progressController } from '../controllers/ProgressController.js'

const router = Router()

// Sub-routers
router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/posts', postRoutes)
router.use('/actions', actionRoutes)
router.use('/progress', progressRoutes)

// Convenient direct endpoints for frontend matching mocks
router.get('/levels', progressController.getLevels.bind(progressController))
router.get('/achievements', progressController.getAchievements.bind(progressController))

export const mainRouter = router
