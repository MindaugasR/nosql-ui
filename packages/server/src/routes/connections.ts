import type { FastifyPluginAsync } from 'fastify'
import { getMongoClient, openSession, closeSession } from '../drivers/mongo.js'
import { TOKEN_HEADER } from '../lib/connection-token.js'

export const connectionsRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { type: string; uri?: string } }>('/test', async (req, reply) => {
    const { type, uri } = req.body
    try {
      if (type === 'mongodb') {
        if (!uri) return reply.status(400).send({ error: 'uri required' })
        const client = getMongoClient(uri)
        await client.connect()
        await client.db('admin').command({ ping: 1 })
        return { ok: true }
      }
      return reply.status(400).send({ error: 'unknown type' })
    } catch (err: any) {
      return reply.status(503).send({ ok: false, error: err.message ?? 'Connection failed' })
    }
  })

  // Open a session: the URI travels once in the body, then only the opaque
  // token is sent (as a header) with every subsequent request.
  app.post<{ Body: { type: string; uri?: string } }>('/connect', async (req, reply) => {
    const { type, uri } = req.body
    if (type !== 'mongodb') return reply.status(400).send({ error: 'unknown type' })
    if (!uri) return reply.status(400).send({ error: 'uri required' })
    try {
      const token = await openSession(uri)
      return { token }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message ?? 'Connection failed' })
    }
  })

  app.post('/disconnect', async (req) => {
    const token = req.headers[TOKEN_HEADER]
    if (typeof token === 'string') await closeSession(token)
    return { ok: true }
  })
}
