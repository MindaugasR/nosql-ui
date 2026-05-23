import type { FastifyPluginAsync } from 'fastify'
import { getMongoClient } from '../drivers/mongo.js'

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
}
