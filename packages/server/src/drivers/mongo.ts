import { MongoClient } from 'mongodb'

const clients = new Map<string, MongoClient>()

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
