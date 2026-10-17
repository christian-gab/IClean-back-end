import { Router } from 'express'
import { progressController } from '../controllers/ProgressController.js'

const router = Router()

router.get('/', progressController.getProgress.bind(progressController))
router.get('/user/:userId', progressController.getProgress.bind(progressController))
router.get('/levels', progressController.getLevels.bind(progressController))
router.get('/achievements', progressController.getAchievements.bind(progressController))
router.post('/reset', progressController.resetProgress.bind(progressController))

export const progressRoutes = router
