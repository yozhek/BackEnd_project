import {MongoClient,Db} from "mongodb"

let client: MongoClient | null = null
let db: Db | null = null

export async function connectToMongo(url: string): Promise<void> {
  if (client) return
  const c = new MongoClient(url)
  await c.connect()
  client = c
  db = c.db()
}

export function getDb(): Db {
  if (!db) throw new Error("MongoDB is not connected")
  return db
}

export async function disconnectMongo(): Promise<void> {
  if (!client) return
  await client.close()
  client = null
  db = null
}
