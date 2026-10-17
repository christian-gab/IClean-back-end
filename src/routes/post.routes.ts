import { Router } from 'express'
import { postController } from '../controllers/PostController.js'
import { validate } from '../middlewares/validate.js'
import { createPostSchema, createCommentSchema } from '../validations/schemas.js'

const router = Router()

router.get('/', postController.listPosts.bind(postController))
router.get('/:id', postController.getPost.bind(postController))
router.post('/', validate(createPostSchema), postController.createPost.bind(postController))
router.post('/:id/like', postController.toggleLike.bind(postController))
router.post('/:id/comments', validate(createCommentSchema), postController.addComment.bind(postController))

export const postRoutes = router
