import { Router } from 'express'
import { actionController } from '../controllers/ActionController.js'
import { validate } from '../middlewares/validate.js'
import { completeActionSchema } from '../validations/schemas.js'

const router = Router()

router.get('/', actionController.listActions.bind(actionController))
router.get('/:id', actionController.getAction.bind(actionController))
router.post('/:id/complete', validate(completeActionSchema), actionController.completeAction.bind(actionController))

export const actionRoutes = router
