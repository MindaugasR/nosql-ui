import { randomUUID } from 'node:crypto'
import { MongoClient } from 'mongodb'

const clients = new Map<string, MongoClient>()
// Opaque session tokens — clients send these instead of the raw connection URI,
// so credentials never travel in query strings (access logs, history, proxies).
const sessions = new Map<string, string>()

export const getMongoClient = (uri: string): MongoClient => {
  if (!clients.has(uri)) {
    clients.set(uri, new MongoClient(uri, { serverSelectionTimeoutMS: 5000 }))
  }
  return clients.get(uri)!
}

export const closeMongoClient = async (uri: string): Promise<void> => {
  const client = clients.get(uri)
  if (client) {
    await client.close()
    clients.delete(uri)
  }
}

/** Connect + ping, then issue a random session token bound to the URI. */
export const openSession = async (uri: string): Promise<string> => {
  const client = getMongoClient(uri)
  await client.connect()
  await client.db('admin').command({ ping: 1 })
  const token = randomUUID()
  sessions.set(token, uri)
  return token
}

export const getSessionClient = (token: string): MongoClient | undefined => {
  const uri = sessions.get(token)
  return uri ? getMongoClient(uri) : undefined
}

export const closeSession = async (token: string): Promise<void> => {
  const uri = sessions.get(token)
  if (!uri) return
  sessions.delete(token)
  // Only close the underlying client when no other session still uses it
  if (![...sessions.values()].includes(uri)) await closeMongoClient(uri)
}
