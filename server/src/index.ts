import cors from 'cors'
import express from 'express'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import generateDashboardRouter from './routes/generate-dashboard.js'
import widgetActionRouter from './routes/widget-action.js'

const app = express()
const PORT = Number(process.env.PORT ?? 4000)

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/generate-dashboard', generateDashboardRouter)
app.use('/api/widget-action', widgetActionRouter)

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
