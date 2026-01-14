import dotenv from "dotenv"
import {afterEach, beforeAll, vi} from "vitest"
import {rmSync, existsSync} from "fs"
import {join} from "path"

process.env.NODE_ENV = "test"
dotenv.config({path: ".env.test", override: true})
dotenv.config()

// mock outgoing telegram calls
vi.mock("../src/telegram.js", () => ({
  sendTelegramMessage: vi.fn()
}))

const dataDir = join(process.cwd(), "data")

beforeAll(() => {
  // clean once before suite
  if (existsSync(dataDir)) rmSync(dataDir, {recursive: true, force: true})
})

afterEach(() => {
  if (existsSync(dataDir)) rmSync(dataDir, {recursive: true, force: true})
})
