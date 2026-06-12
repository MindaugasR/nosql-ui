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

// ── Schema map / relationship detection ──────────────────────────────────────

interface FieldAgg {
  types: Map<string, number>
  oids: ObjectId[]
  arrayOfOid: boolean
  seen: number
}

function walkSchema(
  obj: Record<string, unknown>,
  out: Map<string, FieldAgg>,
  prefix = '',
  depth = 0,
) {
  if (depth > 3) return
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    let agg = out.get(path)
    if (!agg) {
      agg = { types: new Map(), oids: [], arrayOfOid: false, seen: 0 }
      out.set(path, agg)
    }
    agg.seen++
    const type = inferBsonType(v)
    agg.types.set(type, (agg.types.get(type) ?? 0) + 1)

    if (v instanceof ObjectId) {
      if (agg.oids.length < 8) agg.oids.push(v)
    } else if (Array.isArray(v)) {
      const oidItems = v.filter((x): x is ObjectId => x instanceof ObjectId)
      if (oidItems.length > 0) {
        agg.arrayOfOid = true
        for (const oid of oidItems) {
          if (agg.oids.length >= 8) break
          agg.oids.push(oid)
        }
      }
      const firstObj = v.find(
        (x) => x && typeof x === 'object' && !Array.isArray(x) && !(x instanceof ObjectId) && !(x instanceof Date),
      )
      if (firstObj) walkSchema(firstObj as Record<string, unknown>, out, `${path}[]`, depth + 1)
    } else if (v && typeof v === 'object' && !(v instanceof Date)) {
      walkSchema(v as Record<string, unknown>, out, path, depth + 1)
    }
  }
}

function dominantType(agg: FieldAgg): string {
  let best = 'string'
  let bestN = -1
  for (const [t, n] of agg.types) {
    if (n > bestN) { best = t; bestN = n }
  }
  if (best === 'array' && agg.arrayOfOid) return 'Array<ObjectId>'
  return best
}

// customer_id → customer, companyIds → company, productID → product
function fieldBaseName(path: string): string {
  const last = path.split('.').pop()!.replace(/\[\]$/, '')
  return last
    .replace(/_?[iI][dD]s?$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/_+$/, '')
}

// Singular/plural candidates a field base name could refer to
function nameCandidates(base: string): Set<string> {
  const out = new Set<string>()
  if (!base) return out
  out.add(base)
  out.add(`${base}s`)
  out.add(`${base}es`)
  if (base.endsWith('y')) out.add(`${base.slice(0, -1)}ies`)
  if (base.endsWith('s')) out.add(base.slice(0, -1))
  return out
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

  // Build a schema map with relationship detection.
  // Samples documents from the selected collections, infers field schemas and
  // detects references: name heuristics (customer_id → customers) verified by
  // sampled ObjectId lookups; verifyValues=true additionally tests unmatched
  // ObjectId fields against every selected collection ("Auto-Detect").
  app.post<{
    Params: { db: string }
    Body: { collections?: string[]; sampleSize?: number; verifyValues?: boolean }
  }>('/:db/schema-map', async (req, reply) => {
    const { db } = req.params
    const requested = Array.isArray(req.body?.collections)
      ? req.body.collections.filter((c): c is string => typeof c === 'string')
      : []
    const sampleSize = Math.min(Math.max(Number(req.body?.sampleSize) || 50, 10), 200)
    const verifyValues = req.body?.verifyValues === true

    try {
      const mdb = req.mongoClient.db(db)
      const all = (await mdb.listCollections().toArray())
        .map((c) => c.name)
        .filter((n) => !n.startsWith('system.'))
      const selected = requested.length > 0 ? requested.filter((n) => all.includes(n)) : all
      // Cap the graph size — report truncation instead of failing silently
      const names = selected.slice(0, 40)

      // 1) Sample every collection and aggregate its field schema
      const sampled = await Promise.all(
        names.map(async (name) => {
          const coll = mdb.collection(name)
          const [docs, count] = await Promise.all([
            coll
              .aggregate([{ $sample: { size: sampleSize } }])
              .toArray()
              .catch(() => coll.find().limit(sampleSize).toArray()),
            coll.estimatedDocumentCount().catch(() => null),
          ])
          const aggs = new Map<string, FieldAgg>()
          for (const doc of docs) walkSchema(doc as Record<string, unknown>, aggs)
          return { name, count, docs: docs.length, aggs }
        }),
      )

      const lowerNames = new Map(names.map((n) => [n.toLowerCase(), n]))

      // Ratio of sampled ids that exist in the target collection
      const matchRatio = async (target: string, oids: ObjectId[]): Promise<number> => {
        if (oids.length === 0) return 0
        const probe = oids.slice(0, 5)
        const found = await mdb
          .collection(target)
          .countDocuments({ _id: { $in: probe } })
          .catch(() => 0)
        return found / probe.length
      }

      // 2) Detect relationships from ObjectId fields
      const relationships: {
        sourceCollection: string
        sourceField: string
        targetCollection: string
        cardinality: '1:N' | 'N:M'
        confidence: 'high' | 'medium' | 'low'
        verified: boolean
      }[] = []

      for (const src of sampled) {
        for (const [path, agg] of src.aggs) {
          if (path === '_id' || agg.oids.length === 0) continue
          const type = dominantType(agg)
          if (type !== 'ObjectId' && type !== 'Array<ObjectId>') continue

          const cardinality = agg.arrayOfOid ? 'N:M' : '1:N'
          const candidates = [...nameCandidates(fieldBaseName(path))]
            .map((c) => lowerNames.get(c))
            .filter((c): c is string => !!c)

          let matched = false
          // Name match first — verify with sampled ids
          for (const target of candidates) {
            const ratio = await matchRatio(target, agg.oids)
            if (ratio >= 0.4) {
              relationships.push({
                sourceCollection: src.name,
                sourceField: path,
                targetCollection: target,
                cardinality,
                confidence: ratio >= 0.8 ? 'high' : 'medium',
                verified: true,
              })
              matched = true
              break
            }
          }
          // Name match without value confirmation — keep as a low-confidence guess
          if (!matched && candidates.length > 0 && !verifyValues) {
            relationships.push({
              sourceCollection: src.name,
              sourceField: path,
              targetCollection: candidates[0],
              cardinality,
              confidence: 'low',
              verified: false,
            })
            matched = true
          }
          // Auto-Detect: probe every other selected collection by value (in
          // parallel — each probe is a tiny indexed _id lookup)
          if (!matched && verifyValues) {
            const probes = await Promise.all(
              names
                .filter((other) => !candidates.includes(other))
                .map(async (other) => ({ target: other, ratio: await matchRatio(other, agg.oids) })),
            )
            const best = probes
              .filter((p) => p.ratio >= 0.4)
              .sort((a, b) => b.ratio - a.ratio)[0]
            if (best) {
              relationships.push({
                sourceCollection: src.name,
                sourceField: path,
                targetCollection: best.target,
                cardinality,
                confidence: best.ratio >= 0.8 ? 'high' : 'medium',
                verified: true,
              })
            }
          }
        }
      }

      // 3) Shape the response. Card fields are top-level paths plus any nested
      // path that participates in a relationship — edges need a field row
      // (and its handle) to anchor to.
      const collections = sampled.map((s) => {
        const fkPaths = new Set(
          relationships.filter((r) => r.sourceCollection === s.name).map((r) => r.sourceField),
        )
        return {
          name: s.name,
          count: s.count,
          sampled: s.docs,
          fields: [...s.aggs.entries()]
            .filter(([path]) => (!path.includes('.') && !path.includes('[]')) || fkPaths.has(path))
            .map(([path, agg]) => ({
              name: path,
              type: dominantType(agg),
              presence: s.docs > 0 ? Math.min(agg.seen / s.docs, 1) : 0,
            })),
          allFields: [...s.aggs.entries()].map(([path, agg]) => ({
            name: path,
            type: dominantType(agg),
            presence: s.docs > 0 ? Math.min(agg.seen / s.docs, 1) : 0,
          })),
        }
      })

      return {
        collections,
        relationships,
        truncatedFrom: selected.length > names.length ? selected.length : undefined,
      }
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
