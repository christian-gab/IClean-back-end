import { Router } from 'express'
import { actionController } from '../controllers/ActionController.js'
import { photoValidationController } from '../controllers/PhotoValidationController.js'
import { validate } from '../middlewares/validate.js'
import { completeActionSchema, validatePhotoSchema } from '../validations/schemas.js'

const router = Router()

router.get('/', actionController.listActions.bind(actionController))
router.get('/:id', actionController.getAction.bind(actionController))
router.post('/:id/validate-photo', validate(validatePhotoSchema), photoValidationController.validatePhoto.bind(photoValidationController))
router.post('/:id/complete', validate(completeActionSchema), actionController.completeAction.bind(actionController))

export const actionRoutes = router
