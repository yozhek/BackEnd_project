import dotenv from "dotenv"
import {beforeAll,afterAll,afterEach,vi} from "vitest"
import {connectToMongo,disconnectMongo,getDb} from "../src/database/mongo"

// Mock auth middleware to bypass Keycloak/JWKS during tests
vi.mock("../src/middleware/auth.middleware", () => ({
  requireAuth: () => (_req: any,_res: any,next: any) => next()
}))

// Mock outgoing fetch calls (gateway/notification)
vi.stubGlobal("fetch", async () => ({
  ok: true,
  status: 200,
  json: async () => ({}),
  text: async () => ""
} as any))

dotenv.config({path: ".env.test", override: true})
dotenv.config()

const url = process.env.MONGO_URL_TEST || "mongodb://localhost:27018/marketplace_test"

beforeAll(async () => {
  await connectToMongo(url)
})

afterEach(async () => {
  const db = getDb()
  await db.collection("auctions").deleteMany({})
})

afterAll(async () => {
  await disconnectMongo()
})
