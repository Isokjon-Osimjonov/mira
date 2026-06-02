import { Router } from 'express'
import * as ctrl from './telegram.controller'
import { requireAdmin, requirePermission } from '../../middleware/auth'

const router = Router()

router.use(requireAdmin)
router.use(requirePermission('telegram', 'read'))

// Channels
router.get('/channels', ctrl.getChannels)
router.post('/channels', requirePermission('telegram', 'write'), ctrl.createChannel)
router.put('/channels/:id', requirePermission('telegram', 'write'), ctrl.updateChannel)
router.delete('/channels/:id', requirePermission('telegram', 'write'), ctrl.deleteChannel)
router.post('/channels/:id/test', requirePermission('telegram', 'write'), ctrl.testChannel)

// Posts
router.get('/posts', ctrl.getPosts)
router.get('/posts/:id', ctrl.getPostById)
router.post('/posts', requirePermission('telegram', 'write'), ctrl.createPost)
router.put('/posts/:id', requirePermission('telegram', 'write'), ctrl.updatePost)
router.delete('/posts/:id', requirePermission('telegram', 'write'), ctrl.deletePost)
router.post('/posts/:id/send', requirePermission('telegram', 'write'), ctrl.manualSendPost)

export default router
