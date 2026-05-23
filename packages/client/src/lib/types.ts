export type DbType = 'mongodb'

export interface MongoConnection {
  id: string
  type: 'mongodb'
  label: string
  uri: string
}

export type Connection = MongoConnection
export type NewConnection = Omit<MongoConnection, 'id'>
