import { Router } from 'express'
import { extractPrescription } from '../controllers/prescriptionController'

const router = Router()

router.post('/extract', extractPrescription)

export default router
