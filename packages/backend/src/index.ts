import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'

const app = new Hono()

// API routes
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve landing page static files
app.use('/*', serveStatic({ root: '../landing/dist' }))

const port = Number(process.env.PORT) || 3000

console.log(`Server running on port ${port}`)

serve({ fetch: app.fetch, port })

export default app
