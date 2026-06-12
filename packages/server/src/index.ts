import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import staticPlugin from '@fastify/static'
import { mongoRoutes } from './routes/mongo.js'
import { connectionsRoutes } from './routes/connections.js'
import { statsRoutes } from './routes/stats.js'

const PORT = Number(process.env.PORT ?? 3001)
const HOST = process.env.HOST ?? '0.0.0.0'
const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: process.env.NODE_ENV === 'production' ? false : true,
})

// Generous global rate limit — this is a local tool, the limit only guards
// against runaway request loops on the db-backed routes
await app.register(rateLimit, {
  max: 500,
  timeWindow: '1 minute',
})

if (existsSync(publicDir)) {
  await app.register(staticPlugin, { root: publicDir, prefix: '/' })
  app.setNotFoundHandler((_req, reply) => {
    reply.sendFile('index.html')
  })
}

await app.register(connectionsRoutes, { prefix: '/api/connections' })
await app.register(statsRoutes, { prefix: '/api/stats' })
await app.register(mongoRoutes, { prefix: '/api/mongo' })

app.get('/api/health', async () => ({ status: 'ok', version: '0.1.0' }))

app.get('/api/env-connections', async () => {
  const connections = []
  if (process.env.MONGODB_URI) {
    connections.push({
      type: 'mongodb',
      label: process.env.MONGODB_LABEL ?? 'MongoDB (env)',
      uri: process.env.MONGODB_URI,
    })
  }
  return { connections }
})

try {
  await app.listen({ port: PORT, host: HOST })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
