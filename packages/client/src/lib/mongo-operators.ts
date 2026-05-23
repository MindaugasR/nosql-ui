// Centralised MongoDB operator definitions.
// Used by FilterInput, future QueryEditor, and anywhere else that needs operator metadata.

export interface MongoOp {
  label: string
  detail: string
  category: 'comparison' | 'logical' | 'array' | 'element' | 'text'
  // Snippet inserted when operator is chosen inside a field-value object: { "field": <here> }
  valueSnippet: string
  // Full ready-to-use filter snippet when starting from scratch
  filterSnippet: string
  // Human-readable example for tooltips / docs
  example: string
}

export const MONGO_OPS: MongoOp[] = [
  // ── Comparison ────────────────────────────────────────────────────────────
  {
    label: '$eq',
    detail: 'Equal to value',
    category: 'comparison',
    valueSnippet: '{"$eq": #{value}}',
    filterSnippet: '{"#{field}": {"$eq": #{value}}}',
    example: '{ "age": { "$eq": 25 } }',
  },
  {
    label: '$ne',
    detail: 'Not equal to value',
    category: 'comparison',
    valueSnippet: '{"$ne": #{value}}',
    filterSnippet: '{"#{field}": {"$ne": #{value}}}',
    example: '{ "status": { "$ne": "inactive" } }',
  },
  {
    label: '$gt',
    detail: 'Greater than value',
    category: 'comparison',
    valueSnippet: '{"$gt": #{value}}',
    filterSnippet: '{"#{field}": {"$gt": #{value}}}',
    example: '{ "age": { "$gt": 18 } }',
  },
  {
    label: '$gte',
    detail: 'Greater than or equal',
    category: 'comparison',
    valueSnippet: '{"$gte": #{value}}',
    filterSnippet: '{"#{field}": {"$gte": #{value}}}',
    example: '{ "score": { "$gte": 90 } }',
  },
  {
    label: '$lt',
    detail: 'Less than value',
    category: 'comparison',
    valueSnippet: '{"$lt": #{value}}',
    filterSnippet: '{"#{field}": {"$lt": #{value}}}',
    example: '{ "price": { "$lt": 100 } }',
  },
  {
    label: '$lte',
    detail: 'Less than or equal',
    category: 'comparison',
    valueSnippet: '{"$lte": #{value}}',
    filterSnippet: '{"#{field}": {"$lte": #{value}}}',
    example: '{ "rating": { "$lte": 5 } }',
  },
  {
    label: '$in',
    detail: 'Value is in array',
    category: 'comparison',
    valueSnippet: '{"$in": [#{value}]}',
    filterSnippet: '{"#{field}": {"$in": [#{value}]}}',
    example: '{ "role": { "$in": ["admin", "editor"] } }',
  },
  {
    label: '$nin',
    detail: 'Value not in array',
    category: 'comparison',
    valueSnippet: '{"$nin": [#{value}]}',
    filterSnippet: '{"#{field}": {"$nin": [#{value}]}}',
    example: '{ "status": { "$nin": ["banned", "deleted"] } }',
  },
  // ── Element ────────────────────────────────────────────────────────────────
  {
    label: '$exists',
    detail: 'Field exists / does not exist',
    category: 'element',
    valueSnippet: '{"$exists": #{true}}',
    filterSnippet: '{"#{field}": {"$exists": #{true}}}',
    example: '{ "email": { "$exists": true } }',
  },
  {
    label: '$type',
    detail: 'Field is BSON type',
    category: 'element',
    valueSnippet: '{"$type": "#{string}"}',
    filterSnippet: '{"#{field}": {"$type": "#{string}"}}',
    example: '{ "age": { "$type": "int" } }',
  },
  // ── Text / regex ──────────────────────────────────────────────────────────
  {
    label: '$regex',
    detail: 'Value matches regular expression',
    category: 'text',
    valueSnippet: '{"$regex": "#{pattern}", "$options": "i"}',
    filterSnippet: '{"#{field}": {"$regex": "#{pattern}", "$options": "i"}}',
    example: '{ "name": { "$regex": "john", "$options": "i" } }',
  },
  // ── Array ──────────────────────────────────────────────────────────────────
  {
    label: '$size',
    detail: 'Array has exactly N elements',
    category: 'array',
    valueSnippet: '{"$size": #{n}}',
    filterSnippet: '{"#{field}": {"$size": #{n}}}',
    example: '{ "tags": { "$size": 3 } }',
  },
  {
    label: '$all',
    detail: 'Array contains all values',
    category: 'array',
    valueSnippet: '{"$all": [#{value}]}',
    filterSnippet: '{"#{field}": {"$all": [#{value}]}}',
    example: '{ "tags": { "$all": ["mongodb", "nodejs"] } }',
  },
  {
    label: '$elemMatch',
    detail: 'Array element matches conditions',
    category: 'array',
    valueSnippet: '{"$elemMatch": {#{condition}}}',
    filterSnippet: '{"#{field}": {"$elemMatch": {#{condition}}}}',
    example: '{ "scores": { "$elemMatch": { "$gt": 80 } } }',
  },
  // ── Logical ────────────────────────────────────────────────────────────────
  {
    label: '$and',
    detail: 'All conditions must match',
    category: 'logical',
    valueSnippet: '"$and": [{#{condition}}]',
    filterSnippet: '{"$and": [{"#{field}": #{value}}, {#{}}]}',
    example: '{ "$and": [{ "age": { "$gt": 18 } }, { "active": true }] }',
  },
  {
    label: '$or',
    detail: 'At least one condition must match',
    category: 'logical',
    valueSnippet: '"$or": [{#{condition}}]',
    filterSnippet: '{"$or": [{"#{field}": #{value}}, {#{}}]}',
    example: '{ "$or": [{ "role": "admin" }, { "role": "editor" }] }',
  },
  {
    label: '$nor',
    detail: 'None of the conditions match',
    category: 'logical',
    valueSnippet: '"$nor": [{#{condition}}]',
    filterSnippet: '{"$nor": [{"#{field}": #{value}}, {#{}}]}',
    example: '{ "$nor": [{ "status": "banned" }, { "deleted": true }] }',
  },
  {
    label: '$not',
    detail: 'Negates a condition',
    category: 'logical',
    valueSnippet: '"$not": {#{condition}}',
    filterSnippet: '{"#{field}": {"$not": {#{condition}}}}',
    example: '{ "age": { "$not": { "$lt": 18 } } }',
  },
]

// ── Template helpers ──────────────────────────────────────────────────────────

export interface FilterTemplate {
  label: string
  detail: string
  snippet: string
}

export const FILTER_TEMPLATES: FilterTemplate[] = [
  {
    label: 'field = value',
    detail: 'simple equality',
    snippet: '{"#{field}": #{value}}',
  },
  {
    label: 'field > value',
    detail: 'greater than',
    snippet: '{"#{field}": {"$gt": #{}}}',
  },
  {
    label: 'field contains text',
    detail: 'case-insensitive regex',
    snippet: '{"#{field}": {"$regex": "#{text}", "$options": "i"}}',
  },
  {
    label: 'field in list',
    detail: '$in operator',
    snippet: '{"#{field}": {"$in": [#{}]}}',
  },
  {
    label: 'AND conditions',
    detail: 'multiple required',
    snippet: '{"$and": [{"#{field}": #{value}}, {#{}}]}',
  },
  {
    label: 'OR conditions',
    detail: 'any must match',
    snippet: '{"$or": [{"#{field}": #{value}}, {#{}}]}',
  },
  {
    label: 'field exists',
    detail: 'field must be present',
    snippet: '{"#{field}": {"$exists": true}}',
  },
]

export const comparisonOps = MONGO_OPS.filter(o => o.category === 'comparison')
export const logicalOps    = MONGO_OPS.filter(o => o.category === 'logical')
export const elementOps    = MONGO_OPS.filter(o => o.category === 'element')
export const arrayOps      = MONGO_OPS.filter(o => o.category === 'array')
export const textOps       = MONGO_OPS.filter(o => o.category === 'text')
