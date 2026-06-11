import type { FastifyReply, FastifyRequest } from 'fastify'
import type { MongoClient } from 'mongodb'
import { getSessionClient } from '../drivers/mongo.js'

declare module 'fastify' {
  interface FastifyRequest {
    mongoClient: MongoClient
  }
}

export const TOKEN_HEADER = 'x-connection-token'

// preHandler hook: resolves the connection token header into req.mongoClient.
// 401 + INVALID_CONNECTION_TOKEN tells the client to reconnect and retry.
export const requireConnectionToken = async (req: FastifyRequest, reply: FastifyReply) => {
  const token = req.headers[TOKEN_HEADER]
  const client = typeof token === 'string' ? getSessionClient(token) : undefined
  if (!client) {
    return reply
      .status(401)
      .send({ error: 'Invalid or expired connection token', code: 'INVALID_CONNECTION_TOKEN' })
  }
  req.mongoClient = client
}
