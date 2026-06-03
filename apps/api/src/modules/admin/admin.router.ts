import { Router } from 'express'
import { requireAdmin, requireSuperAdmin } from '../../middleware/auth'
import { backupDatabase } from '../../config/cron'

const router = Router()

router.post('/backup/trigger', requireSuperAdmin, async (req, res) => {
  try {
    await backupDatabase()
    res.json({ data: { success: true }, error: null })
  } catch (err: any) {
    res.status(500).json({ data: null, error: { message: err.message, code: 'INTERNAL_ERROR' } })
  }
})

export default router
