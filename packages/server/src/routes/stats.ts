import type { FastifyPluginAsync } from 'fastify'
import { getMongoClient } from '../drivers/mongo.js'

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

const getMongoStats = async (uri: string): Promise<ServerStats> => {
  const client = getMongoClient(uri)
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

const getMongoDbList = async (uri: string): Promise<DbEntry[]> => {
  const client = getMongoClient(uri)
  const result = await client.db('admin').admin().listDatabases()
  return result.databases.map((db) => ({
    name: db.name,
    sizeBytes: db.sizeOnDisk ?? null,
    collections: null,
  }))
}

const getMongoCollections = async (uri: string, db: string): Promise<CollectionStat[]> => {
  const client = getMongoClient(uri)
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

type MongoQs = { uri?: string }

export const statsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: MongoQs }>('/server', async (req, reply) => {
    if (!req.query.uri) return reply.status(400).send({ error: 'uri required' })
    try {
      return await getMongoStats(req.query.uri)
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  app.get<{ Querystring: MongoQs }>('/databases', async (req, reply) => {
    if (!req.query.uri) return reply.status(400).send({ error: 'uri required' })
    try {
      return { databases: await getMongoDbList(req.query.uri) }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  app.get<{ Querystring: MongoQs & { db: string } }>('/collections', async (req, reply) => {
    const { uri, db } = req.query
    if (!uri) return reply.status(400).send({ error: 'uri required' })
    if (!db) return reply.status(400).send({ error: 'db required' })
    try {
      return { collections: await getMongoCollections(uri, db) }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })
}
