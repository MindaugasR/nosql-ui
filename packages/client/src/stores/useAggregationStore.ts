import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import { useConnectionsStore } from './connections'
import { useDatabaseStore } from './useDatabaseStore'
import { useCollectionStore } from './useCollectionStore'
import { useDocumentStore } from './useDocumentStore'
import type { Document as MongoDocument } from '@/types'

export type StageType =
  | '$match' | '$group' | '$sort' | '$project' | '$limit' | '$skip'
  | '$unwind' | '$lookup' | '$addFields' | '$set' | '$count' | '$sample'
  | '$sortByCount' | '$replaceRoot' | '$unset' | '$out' | '$merge' | '$raw'

export type Stage = {
  id: string
  type: StageType
  label: string
  enabled: boolean
  config: Record<string, unknown>
}

export const useAggregationStore = defineStore('aggregation', {
  state: () => ({
    stageList: new Map<string, Stage[]>(),
    resultsList: new Map<string, MongoDocument[]>(),
    runningList: new Map<string, boolean>(),
    errorList: new Map<string, string | null>(),
  }),

  getters: {
    __key: (): string => {
      const connectionStore = useConnectionsStore()
      const databaseStore = useDatabaseStore()
      return `${connectionStore.active?.id}:${databaseStore.database()?.name}`
    },
    stages(state): Stage[] {
      const collStore = useCollectionStore()
      const key = `${this.__key}:${collStore.collection()?.name}`
      return state.stageList.get(key) ?? []
    },
    results(state): MongoDocument[] {
      const collStore = useCollectionStore()
      const key = `${this.__key}:${collStore.collection()?.name}`
      return state.resultsList.get(key) ?? []
    },
    isRunning(state): boolean {
      const collStore = useCollectionStore()
      const key = `${this.__key}:${collStore.collection()?.name}`
      return state.runningList.get(key) ?? false
    },
    error(state): string | null {
      const collStore = useCollectionStore()
      const key = `${this.__key}:${collStore.collection()?.name}`
      return state.errorList.get(key) ?? null
    },
  },

  actions: {
    __collKey(): string {
      const collStore = useCollectionStore()
      return `${this.__key}:${collStore.collection()?.name}`
    },

    addStage(type: StageType) {
      const key = this.__collKey()
      const stages = this.stageList.get(key) ?? []
      const newStage: Stage = {
        id: crypto.randomUUID(),
        type,
        label: type,
        enabled: true,
        config: defaultConfig(type),
      }
      this.stageList.set(key, [...stages, newStage])
    },

    removeStage(id: string) {
      const key = this.__collKey()
      const stages = this.stageList.get(key) ?? []
      this.stageList.set(key, stages.filter(s => s.id !== id))
    },

    moveStage(id: string, direction: 'up' | 'down') {
      const key = this.__collKey()
      const stages = [...(this.stageList.get(key) ?? [])]
      const idx = stages.findIndex(s => s.id === id)
      if (idx === -1) return
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= stages.length) return
      ;[stages[idx], stages[newIdx]] = [stages[newIdx], stages[idx]]
      this.stageList.set(key, stages)
    },

    updateStageConfig(id: string, config: Record<string, unknown>) {
      const key = this.__collKey()
      const stages = this.stageList.get(key) ?? []
      this.stageList.set(key, stages.map(s => s.id === id ? { ...s, config } : s))
    },

    updateStageLabel(id: string, label: string) {
      const key = this.__collKey()
      const stages = this.stageList.get(key) ?? []
      this.stageList.set(key, stages.map(s => s.id === id ? { ...s, label } : s))
    },

    reorderStages(fromIdx: number, toIdx: number) {
      const key = this.__collKey()
      const stages = [...(this.stageList.get(key) ?? [])]
      if (fromIdx < 0 || toIdx < 0 || fromIdx >= stages.length || toIdx >= stages.length) return
      const [moved] = stages.splice(fromIdx, 1)
      stages.splice(toIdx, 0, moved)
      this.stageList.set(key, stages)
    },

    toggleStage(id: string) {
      const key = this.__collKey()
      const stages = this.stageList.get(key) ?? []
      this.stageList.set(key, stages.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
    },

    buildPipeline(): Record<string, unknown>[] {
      const docStore = useDocumentStore()
      const fieldTypes = docStore.fieldTypes()
      return this.stages
        .filter(s => s.enabled)
        .map(s => buildStageObject(s, fieldTypes))
        .filter((s): s is Record<string, unknown> => s !== null)
    },

    async runPipeline() {
      const connStore = useConnectionsStore()
      const dbStore = useDatabaseStore()
      const collStore = useCollectionStore()
      const conn = connStore.active
      const db = dbStore.database()
      const coll = collStore.collection()
      if (!conn || !db || !coll) return

      const key = this.__collKey()
      this.runningList.set(key, true)
      this.errorList.set(key, null)
      try {
        const pipeline = this.buildPipeline()
        const res = await api.data.aggregate(conn, db, coll, pipeline)
        this.resultsList.set(key, res.results)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Pipeline failed'
        this.errorList.set(key, message)
      } finally {
        this.runningList.set(key, false)
      }
    },
  },
})

function defaultConfig(type: StageType): Record<string, unknown> {
  switch (type) {
    case '$match': return { conditions: [] }
    case '$group': return { groupBy: '', accumulators: [{ id: crypto.randomUUID(), output: 'count', op: '$sum', field: '1' }] }
    case '$sort': return { fields: [{ id: crypto.randomUUID(), field: '', direction: 1 }] }
    case '$project': return { mode: 'include', fields: [] }
    case '$limit': return { value: 10 }
    case '$skip': return { value: 0 }
    case '$unwind': return { field: '', preserveNull: false }
    case '$lookup': return { from: '', localField: '', foreignField: '', as: 'joined' }
    case '$addFields': case '$set': return { fields: [{ id: crypto.randomUUID(), name: '', expr: '' }] }
    case '$count': return { outputField: 'count' }
    case '$sample': return { size: 10 }
    case '$sortByCount': return { field: '' }
    case '$replaceRoot': return { newRoot: '' }
    case '$unset': return { fields: [''] }
    case '$out': return { collection: '' }
    case '$merge': return { into: '' }
    case '$raw': return { json: '{}' }
    default: return {}
  }
}

function buildStageObject(stage: Stage, fieldTypes: Record<string, string> = {}): Record<string, unknown> | null {
  const c = stage.config
  switch (stage.type) {
    case '$match': {
      type Cond = { field: string; op: string; value: string; join?: 'and' | 'or' | 'nor' }
      // Walk conditions, splitting on OR/NOR boundaries.
      // AND groups consecutive conditions together (higher precedence).
      // Each OR/NOR boundary starts a new segment with its own operator.
      type Segment = { op: '$or' | '$nor'; clauses: Record<string, unknown>[] }
      const segments: Segment[] = [{ op: '$or', clauses: [] }]
      const segmentOps: ('$or' | '$nor')[] = ['$or']
      for (const cond of (c.conditions as Cond[]) ?? []) {
        if (!cond.field) continue
        const clause = { [cond.field]: { [cond.op]: coerceMatchValue(cond.value, cond.field, cond.op, fieldTypes) } }
        if ((cond.join === 'or' || cond.join === 'nor') && segments[segments.length - 1].clauses.length > 0) {
          const segOp = cond.join === 'nor' ? '$nor' : '$or'
          segments.push({ op: segOp, clauses: [clause] })
          segmentOps.push(segOp)
        } else {
          segments[segments.length - 1].clauses.push(clause)
        }
      }
      const nonEmpty = segments.filter(s => s.clauses.length > 0)
      if (nonEmpty.length === 0) return { $match: {} }
      // Each segment's clauses are merged (ANDed); single segment = no wrapper needed
      const merged = nonEmpty.map(s => ({ op: s.op, doc: Object.assign({}, ...s.clauses) }))
      if (merged.length === 1) return { $match: merged[0].doc }
      // Multiple segments: group by consecutive same operators where possible
      const filter: Record<string, unknown> = {}
      const orParts = merged.filter(s => s.op === '$or').map(s => s.doc)
      const norParts = merged.filter(s => s.op === '$nor').map(s => s.doc)
      if (orParts.length > 0)  filter.$or  = orParts
      if (norParts.length > 0) filter.$nor = norParts
      return { $match: filter }
    }
    case '$group': {
      const acc: Record<string, unknown> = {}
      for (const a of (c.accumulators as Array<{output: string; op: string; field: string}>) ?? []) {
        if (!a.output) continue
        const fieldVal = a.field === '1' || a.field === '' ? 1 : `$${a.field}`
        acc[a.output] = { [a.op]: fieldVal }
      }
      return { $group: { _id: c.groupBy ? `$${c.groupBy}` : null, ...acc } }
    }
    case '$sort': {
      const sort: Record<string, unknown> = {}
      for (const f of (c.fields as Array<{field: string; direction: number}>) ?? []) {
        if (f.field) sort[f.field] = f.direction
      }
      return { $sort: sort }
    }
    case '$project': {
      const proj: Record<string, unknown> = {}
      for (const f of (c.fields as Array<{field: string}>) ?? []) {
        if (f.field) proj[f.field] = c.mode === 'include' ? 1 : 0
      }
      return { $project: proj }
    }
    case '$limit': return { $limit: Number(c.value) || 10 }
    case '$skip': return { $skip: Number(c.value) || 0 }
    case '$unwind': return { $unwind: { path: `$${c.field}`, preserveNullAndEmptyArrays: c.preserveNull } }
    case '$lookup': return { $lookup: { from: c.from, localField: c.localField, foreignField: c.foreignField, as: c.as } }
    case '$addFields': case '$set': {
      const fields: Record<string, unknown> = {}
      for (const f of (c.fields as Array<{name: string; expr: string}>) ?? []) {
        if (f.name) fields[f.name] = f.expr
      }
      return { [stage.type]: fields }
    }
    case '$count': return { $count: c.outputField || 'count' }
    case '$sample': return { $sample: { size: Number(c.size) || 10 } }
    case '$sortByCount': return { $sortByCount: c.field ? `$${c.field}` : '$_id' }
    case '$replaceRoot': return { $replaceRoot: { newRoot: c.newRoot || '$$ROOT' } }
    case '$unset': return { $unset: (c.fields as string[]).filter(Boolean) }
    case '$out': return { $out: c.collection }
    case '$merge': return { $merge: { into: c.into } }
    case '$raw': {
      try { return JSON.parse(c.json as string) } catch { return null }
    }
    default: return null
  }
}

function coerceMatchValue(v: string, field: string, op: string, fieldTypes: Record<string, string>): unknown {
  if (op === '$exists') return v !== 'false'
  const ftype = fieldTypes[field]
  const isOidField = ftype === 'ObjectId'
  if (op === '$in' || op === '$nin') {
    return v.split(',').map(item => {
      const t = item.trim()
      if (t === '') return undefined
      if (isOidField && /^[0-9a-f]{24}$/i.test(t)) return { $oid: t }
      return coerceValue(t)
    }).filter(item => item !== undefined)
  }
  if (isOidField && /^[0-9a-f]{24}$/i.test(v.trim())) return { $oid: v.trim() }
  return coerceValue(v)
}

function coerceValue(v: string): unknown {
  if (v === 'true') return true
  if (v === 'false') return false
  if (v === 'null') return null
  const n = Number(v)
  if (v !== '' && !isNaN(n)) return n
  return v
}
