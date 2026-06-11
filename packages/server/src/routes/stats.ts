import type { FastifyPluginAsync } from 'fastify'
import type { MongoClient } from 'mongodb'
import { requireConnectionToken } from '../lib/connection-token.js'

export interface ServerStats {
  version: string | null
  uptime: number | null
  memory: { used: number; total: number } | null
  connections: { current: number; available: number } | null
  ops: { insert: number; query: number; update: number; delete: number } | null
}

export interface DbEntry {
  name: string
  sizeBytes: number | null
  collections: number | null
}

export interface CollectionStat {
  name: string
  docCount: number | null
  storageSize: number | null
  avgObjSize: number | null
  indexes: number | null
}

const getMongoStats = async (client: MongoClient): Promise<ServerStats> => {
  const status = await client.db('admin').admin().serverStatus()
  return {
    version: status.version ?? null,
    uptime: status.uptime ?? null,
    memory: status.mem ? { used: status.mem.resident ?? 0, total: status.mem.virtual ?? 0 } : null,
    connections: status.connections
      ? { current: status.connections.current, available: status.connections.available }
      : null,
    ops: status.opcounters
      ? {
          insert: status.opcounters.insert,
          query: status.opcounters.query,
          update: status.opcounters.update,
          delete: status.opcounters.delete,
        }
      : null,
  }
}

const getMongoDbList = async (client: MongoClient): Promise<DbEntry[]> => {
  const result = await client.db('admin').admin().listDatabases()
  return result.databases.map((db) => ({
    name: db.name,
    sizeBytes: db.sizeOnDisk ?? null,
    collections: null,
  }))
}

const getMongoCollections = async (client: MongoClient, db: string): Promise<CollectionStat[]> => {
  const cols = await client.db(db).listCollections().toArray()
  return Promise.all(
    cols.map(async (col) => {
      try {
        const s = await client.db(db).command({ collStats: col.name })
        return {
          name: col.name,
          docCount: s.count ?? null,
          storageSize: s.storageSize ?? null,
          avgObjSize: s.avgObjSize ?? null,
          indexes: s.nindexes ?? null,
        }
      } catch {
        return { name: col.name, docCount: null, storageSize: null, avgObjSize: null, indexes: null }
      }
    })
  )
}

export const statsRoutes: FastifyPluginAsync = async (app) => {
  // Resolve x-connection-token into req.mongoClient for every stats route
  app.addHook('preHandler', requireConnectionToken)

  app.get('/server', async (req, reply) => {
    try {
      return await getMongoStats(req.mongoClient)
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  app.get('/databases', async (req, reply) => {
    try {
      return { databases: await getMongoDbList(req.mongoClient) }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  app.get<{ Querystring: { db: string } }>('/collections', async (req, reply) => {
    const { db } = req.query
    if (!db) return reply.status(400).send({ error: 'db required' })
    try {
      return { collections: await getMongoCollections(req.mongoClient, db) }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })
}
