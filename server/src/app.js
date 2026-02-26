import express from 'express'
import cors from 'cors'
import promptsRouter from './routes/prompts.js'
import statsRouter from './routes/stats.js'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/prompts', promptsRouter)
app.use('/api/stats', statsRouter)

export default app
