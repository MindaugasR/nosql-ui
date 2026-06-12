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

// ── Shell methods (Query Editor autocomplete) ────────────────────────────────

export interface ShellMethod {
  label: string
  detail: string
  description: string
  snippet: string
  isWrite?: boolean
}

export const COLLECTION_METHODS: ShellMethod[] = [
  {
    label: 'find',
    detail: 'query documents',
    description: 'Selects documents matching the filter. Chain .sort/.limit/.skip/.project.',
    snippet: 'find({ #{} })',
  },
  {
    label: 'findOne',
    detail: 'single document',
    description: 'Returns the first document matching the filter, or null.',
    snippet: 'findOne({ #{} })',
  },
  {
    label: 'aggregate',
    detail: 'aggregation pipeline',
    description: 'Runs an aggregation pipeline — an array of stages like $match, $group, $lookup.',
    snippet: 'aggregate([ { #{} } ])',
  },
  {
    label: 'countDocuments',
    detail: 'count matching',
    description: 'Counts documents matching the filter (accurate, scans the collection).',
    snippet: 'countDocuments({ #{} })',
  },
  {
    label: 'estimatedDocumentCount',
    detail: 'fast count',
    description: 'Estimates the document count from collection metadata — fast but approximate.',
    snippet: 'estimatedDocumentCount()',
  },
  {
    label: 'distinct',
    detail: 'unique values',
    description: 'Returns the distinct values of a field, optionally filtered.',
    snippet: 'distinct("#{field}")',
  },
  {
    label: 'insertOne',
    detail: 'insert document',
    description: 'Inserts a single document into the collection.',
    snippet: 'insertOne({ #{} })',
    isWrite: true,
  },
  {
    label: 'insertMany',
    detail: 'insert documents',
    description: 'Inserts an array of documents into the collection.',
    snippet: 'insertMany([ { #{} } ])',
    isWrite: true,
  },
  {
    label: 'updateOne',
    detail: 'update first match',
    description: 'Updates the first document matching the filter using update operators like $set.',
    snippet: 'updateOne({ #{filter} }, { $set: { #{} } })',
    isWrite: true,
  },
  {
    label: 'updateMany',
    detail: 'update all matches',
    description: 'Updates every document matching the filter using update operators like $set.',
    snippet: 'updateMany({ #{filter} }, { $set: { #{} } })',
    isWrite: true,
  },
  {
    label: 'replaceOne',
    detail: 'replace document',
    description: 'Replaces the first document matching the filter with a whole new document.',
    snippet: 'replaceOne({ #{filter} }, { #{} })',
    isWrite: true,
  },
  {
    label: 'deleteOne',
    detail: 'delete first match',
    description: 'Deletes the first document matching the filter.',
    snippet: 'deleteOne({ #{} })',
    isWrite: true,
  },
  {
    label: 'deleteMany',
    detail: 'delete all matches',
    description: 'Deletes every document matching the filter. Use with care.',
    snippet: 'deleteMany({ #{} })',
    isWrite: true,
  },
  {
    label: 'drop',
    detail: 'drop collection',
    description: 'Removes the entire collection, including all documents and indexes.',
    snippet: 'drop()',
    isWrite: true,
  },
]

export const CURSOR_CHAIN_METHODS: ShellMethod[] = [
  {
    label: 'sort',
    detail: 'order results',
    description: 'Sorts results: 1 ascending, -1 descending — e.g. .sort({ createdAt: -1 }).',
    snippet: 'sort({ #{field}: -1 })',
  },
  {
    label: 'limit',
    detail: 'cap result count',
    description: 'Limits the number of returned documents.',
    snippet: 'limit(#{20})',
  },
  {
    label: 'skip',
    detail: 'skip documents',
    description: 'Skips the first N documents — combine with .limit() for paging.',
    snippet: 'skip(#{0})',
  },
  {
    label: 'project',
    detail: 'select fields',
    description: 'Includes (1) or excludes (0) fields from the returned documents.',
    snippet: 'project({ #{field}: 1 })',
  },
]
