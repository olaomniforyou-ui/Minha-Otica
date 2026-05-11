import { Router } from 'express'
import { extractDocument } from '../controllers/documentController'

const router = Router()
router.post('/extract', extractDocument)
export default router
