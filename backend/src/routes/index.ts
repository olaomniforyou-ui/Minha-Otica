import { Router } from 'express'
import adminRoutes        from './admin'
import registerRoutes     from './register'
import prescriptionRoutes from './prescription'
import documentRoutes     from './document'
import devRoutes          from './dev'
import lgpdRoutes         from './lgpd'
import purchasesRoutes    from './purchases'

const router = Router()

router.use('/admin',         adminRoutes)
router.use('/auth/register', registerRoutes)
router.use('/prescription',  prescriptionRoutes)
router.use('/document',      documentRoutes)
router.use('/v1/dev',        devRoutes)
router.use('/lgpd',          lgpdRoutes)
router.use('/purchases',     purchasesRoutes)

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default router
