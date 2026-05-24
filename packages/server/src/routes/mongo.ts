import type { FastifyPluginAsync } from 'fastify'
import { ObjectId } from 'mongodb'
import { getMongoClient } from '../drivers/mongo.js'

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

interface MongoQuery {
  Querystring: { uri: string }
  Params: { db?: string; collection?: string }
  Body: Record<string, unknown>
}

export const mongoRoutes: FastifyPluginAsync = async (app) => {
  // List databases
  app.get<{ Querystring: { uri: string } }>('/databases', async (req, reply) => {
    const { uri } = req.query
    if (!uri) return reply.status(400).send({ error: 'uri required' })
    try {
      const client = getMongoClient(uri)
      const result = await client.db('admin').admin().listDatabases()
      return { databases: result.databases }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  // List collections in a database
  app.get<{ Querystring: { uri: string }; Params: { db: string } }>(
    '/:db/collections',
    async (req, reply) => {
      const { uri } = req.query
      const { db } = req.params
      if (!uri) return reply.status(400).send({ error: 'uri required' })
      try {
        const client = getMongoClient(uri)
        const collections = await client.db(db).listCollections().toArray()
        return { collections }
      } catch (err: any) {
        return reply.status(503).send({ error: err.message })
      }
    }
  )

  // Get collection stats
  app.get<{ Querystring: { uri: string }; Params: { db: string; collection: string } }>(
    '/:db/:collection/stats',
    async (req, reply) => {
      const { uri } = req.query
      const { db, collection } = req.params
      if (!uri) return reply.status(400).send({ error: 'uri required' })
      try {
        const client = getMongoClient(uri)
        const stats = await client.db(db).command({ collStats: collection })
        return { stats }
      } catch (err: any) {
        return reply.status(503).send({ error: err.message })
      }
    }
  )

  // Get collection indexes
  app.get<{ Querystring: { uri: string }; Params: { db: string; collection: string } }>(
    '/:db/:collection/indexes',
    async (req, reply) => {
      const { uri } = req.query
      const { db, collection } = req.params
      if (!uri) return reply.status(400).send({ error: 'uri required' })
      try {
        const client = getMongoClient(uri)
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

  // Find documents
  app.post<{
    Querystring: { uri: string; skip?: string; limit?: string }
    Params: { db: string; collection: string }
    Body: { filter?: Record<string, unknown>; sort?: [string, 1 | -1][]; projection?: Record<string, unknown> }
  }>('/:db/:collection/find', async (req, reply) => {
    const { uri, skip = '0', limit = '20' } = req.query
    const { db, collection } = req.params
    if (!uri) return reply.status(400).send({ error: 'uri required' })
    try {
      const client = getMongoClient(uri)
      const col = client.db(db).collection(collection)
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
    Querystring: { uri: string }
    Params: { db: string; collection: string }
    Body: Record<string, unknown>
  }>('/:db/:collection/insert', async (req, reply) => {
    const { uri } = req.query
    const { db, collection } = req.params
    if (!uri) return reply.status(400).send({ error: 'uri required' })
    try {
      const client = getMongoClient(uri)
      const result = await client.db(db).collection(collection).insertOne(req.body)
      return { insertedId: result.insertedId }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  // Insert many documents
  app.post<{
    Querystring: { uri: string }
    Params: { db: string; collection: string }
    Body: { documents: Record<string, unknown>[] }
  }>('/:db/:collection/insertMany', async (req, reply) => {
    const { uri } = req.query
    const { db, collection } = req.params
    if (!uri) return reply.status(400).send({ error: 'uri required' })
    const docs = req.body?.documents
    if (!Array.isArray(docs) || docs.length === 0)
      return reply.status(400).send({ error: 'documents array required' })
    try {
      const client = getMongoClient(uri)
      const result = await client.db(db).collection(collection).insertMany(docs)
      return { insertedCount: result.insertedCount }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  // Update document by _id
  app.put<{
    Querystring: { uri: string }
    Params: { db: string; collection: string; id: string }
    Body: Record<string, unknown>
  }>('/:db/:collection/:id', async (req, reply) => {
    const { uri } = req.query
    const { db, collection, id } = req.params
    if (!uri) return reply.status(400).send({ error: 'uri required' })
    try {
      const { ObjectId } = await import('mongodb')
      const client = getMongoClient(uri)
      const result = await client
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
    Querystring: { uri: string }
    Params: { db: string; collection: string; id: string }
  }>('/:db/:collection/:id', async (req, reply) => {
    const { uri } = req.query
    const { db, collection, id } = req.params
    if (!uri) return reply.status(400).send({ error: 'uri required' })
    try {
      const { ObjectId } = await import('mongodb')
      const client = getMongoClient(uri)
      const result = await client
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
    Querystring: { uri: string }
    Params: { db: string; id: string }
  }>('/:db/resolve/:id', async (req, reply) => {
    const { uri } = req.query
    const { db, id } = req.params
    if (!uri) return reply.status(400).send({ error: 'uri required' })
    try {
      const { ObjectId } = await import('mongodb')
      const oid = new ObjectId(id)
      const client = getMongoClient(uri)
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
    Querystring: { uri: string }
    Params: { db: string }
    Body: Record<string, unknown>
  }>('/:db/command', async (req, reply) => {
    const { uri } = req.query
    const { db } = req.params
    if (!uri) return reply.status(400).send({ error: 'uri required' })
    try {
      const client = getMongoClient(uri)
      const result = await client.db(db).command(req.body)
      return { result }
    } catch (err: any) {
      return reply.status(503).send({ error: err.message })
    }
  })

  // Run aggregation pipeline
  app.post<{ Querystring: { uri: string }; Params: { db: string; collection: string } }>(
    '/:db/:collection/aggregate',
    async (req, reply) => {
      const { uri } = req.query
      const { db, collection } = req.params
      const { pipeline = [], options = {} } = req.body as { pipeline: any[]; options?: any }
      if (!uri) return reply.status(400).send({ error: 'uri required' })
      try {
        const client = getMongoClient(uri)
        const coll = client.db(db).collection(collection)
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
