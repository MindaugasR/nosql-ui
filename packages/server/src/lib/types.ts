export type DbType = 'mongodb' | 'cassandra' | 'couchdb'

export interface MongoConnection {
  type: 'mongodb'
  uri: string
}

export interface CassandraConnection {
  type: 'cassandra'
  contactPoints: string[]
  localDataCenter: string
  username?: string
  password?: string
}

export interface CouchConnection {
  type: 'couchdb'
  url: string
  username?: string
  password?: string
}

export type ConnectionConfig = MongoConnection | CassandraConnection | CouchConnection
