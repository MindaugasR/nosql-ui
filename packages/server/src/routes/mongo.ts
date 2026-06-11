import type { FastifyPluginAsync } from 'fastify'
import { ObjectId } from 'mongodb'
import { requireConnectionToken } from '../lib/connection-token.js'

function inferBsonType(v: unknown): string {
  if (v === null) return "null";
  if (v instanceof ObjectId) return "ObjectId";
  if (v instanceof Date) return "date";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") return Number.isInteger(v) ? "int" : "double";
  if (Array.isArray(v)) return "array";
  if (typeof v === "object") return "object";
  return "string";
}

function collectFieldTypes(
  obj: Record<string, unknown>,
  typeMap: Map<string, string>,
  prefix = "",
  depth = 0,
) {
  if (depth > 4) return;
  for (const [k, v] of Object.entries(obj)) {
    const name = prefix ? `${prefix}.${k}` : k;
    if (!typeMap.has(name)) typeMap.set(name, inferBsonType(v));
    if (
      typeof v === "object" && v !== null &&
      !Array.isArray(v) && !(v instanceof ObjectId) && !(v instanceof Date)
    ) {
      collectFieldTypes(v as Record<string, unknown>, typeMap, name, depth + 1);
    }
  }
}

async function coerceObjectIds(value: unknown, fieldName?: string): Promise<unknown> {
  // Explicit Extended JSON marker {"$oid": "..."} → ObjectId
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    if ('$oid' in obj && Object.keys(obj).length === 1 && typeof obj.$oid === 'string') {
      try { return new ObjectId(obj.$oid) } catch { return value }
    }
    const entries = await Promise.all(
      Object.entries(obj).map(async ([k, v]) => {
        // Operator keys ($eq, $in, $and …) inherit the parent field context
        const childField = k.startsWith('$') ? fieldName : k
        return [k, await coerceObjectIds(v, childField)]
      })
    )
    return Object.fromEntries(entries)
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((v) => coerceObjectIds(v, fieldName)))
  }
  // Auto-coerce only the _id field — every other field is left as-is
  if (fieldName === '_id' && typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value)) {
    try { return new ObjectId(value) } catch { return value }
  }
  return value
}

export const mongoRoutes: FastifyPluginAsync = async (app) => {
  // Every route in this plugin resolves the x-connection-token header
  // into req.mongoClient — the raw URI never travels with data requests.
  app.addHook('preHandler', requireConnectionToken)

  // List databases
  app.get('/databases', async (req, reply) => {
    try {
      const result = await req.mongoClient.db('admin').admin().listDatabases()
      return { databases: result.databases }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  // List collections in a database
  app.get<{ Params: { db: string } }>('/:db/collections', async (req, reply) => {
    const { db } = req.params
    try {
      const collections = await req.mongoClient.db(db).listCollections().toArray()
      return { collections }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  // Get collection stats
  app.get<{ Params: { db: string; collection: string } }>(
    '/:db/:collection/stats',
    async (req, reply) => {
      const { db, collection } = req.params
      try {
        const stats = await req.mongoClient.db(db).command({ collStats: collection })
        return { stats }
      } catch (err: any) {
        return reply.status(503).send({ error: err.message })
      }
    }
  )

  // Get collection indexes
  app.get<{ Params: { db: string; collection: string } }>(
    '/:db/:collection/indexes',
    async (req, reply) => {
      const { db, collection } = req.params
      try {
        const client = req.mongoClient
        const coll = client.db(db).collection(collection)

        const [indexDefs, statsResult, collStatsResult] = await Promise.allSettled([
          coll.indexes(),
          coll.aggregate([{ $indexStats: {} }]).toArray(),
          client.db(db).command({ collStats: collection, scale: 1024 }),
        ])

        const usageMap = new Map<string, { ops: number; since: Date }>()
        if (statsResult.status === 'fulfilled') {
          for (const s of statsResult.value as any[]) {
            usageMap.set(s.name, { ops: Number(s.accesses?.ops ?? 0), since: s.accesses?.since })
          }
        }

        const sizeMap = new Map<string, number>()
        if (collStatsResult.status === 'fulfilled') {
          const indexSizes = collStatsResult.value?.indexSizes ?? {}
          for (const [name, bytes] of Object.entries(indexSizes)) {
            sizeMap.set(name, Math.round(Number(bytes)))
          }
        }

        const defs = indexDefs.status === 'fulfilled' ? indexDefs.value : []
        const indexes = defs.map((idx: any) => ({
          key: idx.key,
          name: idx.name,
          unique: idx.unique,
          sparse: idx.sparse,
          expireAfterSeconds: idx.expireAfterSeconds,
          hidden: idx.hidden,
          partialFilterExpression: idx.partialFilterExpression,
          usageOps: usageMap.get(idx.name)?.ops,
          usageSince: usageMap.get(idx.name)?.since,
          sizeKb: sizeMap.get(idx.name),
        }))

        return { indexes }
      } catch (err: any) {
        return reply.status(503).send({ error: err.message })
      }
    }
  )

  // Create a collection index
  app.post<{
    Params: { db: string; collection: string }
    Body: {
      keys: Record<string, 1 | -1 | 'text' | '2dsphere'>
      options?: {
        name?: string
        unique?: boolean
        sparse?: boolean
        hidden?: boolean
        expireAfterSeconds?: number
        partialFilterExpression?: Record<string, unknown>
      }
    }
  }>('/:db/:collection/indexes', async (req, reply) => {
    const { db, collection } = req.params
    const keys = req.body?.keys
    if (!keys || Object.keys(keys).length === 0)
      return reply.status(400).send({ error: 'at least one indexed field is required' })
    try {
      const name = await req.mongoClient
        .db(db)
        .collection(collection)
        .createIndex(keys, req.body?.options ?? {})
      return { name }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  // Drop a collection index by name
  app.delete<{
    Params: { db: string; collection: string; name: string }
  }>('/:db/:collection/indexes/:name', async (req, reply) => {
    const { db, collection, name } = req.params
    if (name === '_id_') return reply.status(400).send({ error: 'cannot drop the default _id index' })
    try {
      await req.mongoClient.db(db).collection(collection).dropIndex(name)
      return { dropped: name }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  // Find documents
  app.post<{
    Querystring: { skip?: string; limit?: string }
    Params: { db: string; collection: string }
    Body: { filter?: Record<string, unknown>; sort?: [string, 1 | -1][]; projection?: Record<string, unknown> }
  }>('/:db/:collection/find', async (req, reply) => {
    const { skip = '0', limit = '20' } = req.query
    const { db, collection } = req.params
    try {
      const col = req.mongoClient.db(db).collection(collection)
      const filter = await coerceObjectIds(req.body?.filter ?? {}) as Record<string, unknown>
      const sort = req.body?.sort ?? []
      const projection = req.body?.projection ?? {}
      const [documents, total] = await Promise.all([
        col.find(filter, { projection }).sort(sort).skip(Number(skip)).limit(Number(limit)).toArray(),
        col.countDocuments(filter),
      ])
      const typeMap = new Map<string, string>()
      documents.slice(0, 20).forEach((doc) => collectFieldTypes(doc as Record<string, unknown>, typeMap))
      const fieldTypes = Object.fromEntries(typeMap)
      return { documents, total, skip: Number(skip), limit: Number(limit), fieldTypes }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  // Insert document
  app.post<{
    Params: { db: string; collection: string }
    Body: Record<string, unknown>
  }>('/:db/:collection/insert', async (req, reply) => {
    const { db, collection } = req.params
    try {
      const result = await req.mongoClient.db(db).collection(collection).insertOne(req.body)
      return { insertedId: result.insertedId }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  // Insert many documents
  app.post<{
    Params: { db: string; collection: string }
    Body: { documents: Record<string, unknown>[] }
  }>('/:db/:collection/insertMany', async (req, reply) => {
    const { db, collection } = req.params
    const docs = req.body?.documents
    if (!Array.isArray(docs) || docs.length === 0)
      return reply.status(400).send({ error: 'documents array required' })
    try {
      const result = await req.mongoClient.db(db).collection(collection).insertMany(docs)
      return { insertedCount: result.insertedCount }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  // Update document by _id
  app.put<{
    Params: { db: string; collection: string; id: string }
    Body: Record<string, unknown>
  }>('/:db/:collection/:id', async (req, reply) => {
    const { db, collection, id } = req.params
    try {
      const result = await req.mongoClient
        .db(db)
        .collection(collection)
        .replaceOne({ _id: new ObjectId(id) }, req.body)
      return { matched: result.matchedCount, modified: result.modifiedCount }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  // Delete document by _id
  app.delete<{
    Params: { db: string; collection: string; id: string }
  }>('/:db/:collection/:id', async (req, reply) => {
    const { db, collection, id } = req.params
    try {
      const result = await req.mongoClient
        .db(db)
        .collection(collection)
        .deleteOne({ _id: new ObjectId(id) })
      return { deleted: result.deletedCount }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  // Resolve an ObjectId across all collections in a database
  app.get<{
    Params: { db: string; id: string }
  }>('/:db/resolve/:id', async (req, reply) => {
    const { db, id } = req.params
    try {
      const oid = new ObjectId(id)
      const client = req.mongoClient
      const cols = await client.db(db).listCollections().toArray()
      const results = await Promise.all(
        cols.map(async (col) => {
          const doc = await client.db(db).collection(col.name).findOne({ _id: oid })
          return doc ? { doc, collection: col.name } : null
        })
      )
      const found = results.find((r) => r !== null)
      if (!found) return reply.status(404).send({ error: 'Document not found' })
      return found
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  // Run raw command
  app.post<{
    Params: { db: string }
    Body: Record<string, unknown>
  }>('/:db/command', async (req, reply) => {
    const { db } = req.params
    try {
      const result = await req.mongoClient.db(db).command(req.body)
      return { result }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  // Run aggregation pipeline
  app.post<{ Params: { db: string; collection: string } }>(
    '/:db/:collection/aggregate',
    async (req, reply) => {
      const { db, collection } = req.params
      const { pipeline = [], options = {} } = req.body as { pipeline: any[]; options?: any }
      try {
        const coll = req.mongoClient.db(db).collection(collection)
        const processedPipeline = await Promise.all(
          (pipeline as any[]).map(async (stage) => {
            if (stage && '$match' in stage) {
              return { $match: await coerceObjectIds(stage.$match) as Record<string, unknown> }
            }
            return stage
          })
        )
        const results = await coll.aggregate(processedPipeline, options).toArray()
        return { results, count: results.length }
      } catch (err: any) {
        return reply.status(400).send({ error: err.message })
      }
    }
  )
}
