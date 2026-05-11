import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import routes from './routes'
import { errorHandler } from './middleware/errorHandler'

dotenv.config()

const app  = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

// ── Segurança ─────────────────────────────────────────────────
app.use(helmet())
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  }),
)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 200,
    message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
  }),
)

// ── Body parser ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Rotas ─────────────────────────────────────────────────────
app.use('/api', routes)

// ── Error handler ────────────────────────────────────────────
app.use(errorHandler)

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Minha Ótica Backend`)
  console.log(`   Rodando em: http://localhost:${PORT}`)
  console.log(`   Ambiente:   ${process.env.NODE_ENV ?? 'development'}\n`)
})

export default app
