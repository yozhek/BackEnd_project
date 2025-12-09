import "dotenv/config"
import {beforeAll,afterAll,afterEach} from "vitest"
import {connectToMongo,disconnectMongo,getDb} from "../src/database/mongo"

const url = process.env.MONGO_URL || "mongodb://localhost:27018/marketplace_test"

beforeAll(async () => {
  await connectToMongo(url)
})

afterEach(async () => {
  const db = getDb()
  await db.collection("products").deleteMany({})
  await db.collection("orders").deleteMany({})
})

afterAll(async () => {
  await disconnectMongo()
})
