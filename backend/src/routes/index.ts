import { Router } from 'express'
import adminRoutes        from './admin'
import registerRoutes     from './register'
import prescriptionRoutes from './prescription'
import documentRoutes     from './document'
import devRoutes          from './dev'
import lgpdRoutes         from './lgpd'
import purchasesRoutes    from './purchases'
import expensesRoutes     from './expenses'
import conveniosRoutes    from './convenios'
import aiRoutes           from './ai'
import catalogRoutes      from './catalog'

const router = Router()

router.use('/catalog',       catalogRoutes) // público, sem auth
router.use('/admin',         adminRoutes)
router.use('/auth/register', registerRoutes)
router.use('/prescription',  prescriptionRoutes)
router.use('/document',      documentRoutes)
router.use('/v1/dev',        devRoutes)
router.use('/lgpd',          lgpdRoutes)
router.use('/purchases',     purchasesRoutes)
router.use('/expenses',      expensesRoutes)
router.use('/convenios',     conveniosRoutes)
router.use('/ai',            aiRoutes)

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default router
