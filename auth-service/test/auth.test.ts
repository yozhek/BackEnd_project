import request from "supertest"
import {describe,it,expect,vi,beforeEach} from "vitest"
import {app} from "../src/api/server"
import * as kc from "../src/services/keycloak.service"

vi.mock("../src/services/keycloak.service", () => ({
  registerUser: vi.fn()
}))

const registerUser = kc.registerUser as unknown as ReturnType<typeof vi.fn>

describe("auth service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns health", async () => {
    const res = await request(app).get("/health")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({status:"ok"})
  })

  it("validates register payload", async () => {
    const res = await request(app).post("/register").send({username:"", email:"", password:""})
    expect(res.status).toBe(400)
    expect(res.body.errors).toBeDefined()
  })

  it("registers user via keycloak service", async () => {
    registerUser.mockResolvedValue({id:"1", username:"u", email:"e", role:"buyer"})
    const res = await request(app)
      .post("/register")
      .send({username:"user", email:"user@example.com", password:"pass", role:"buyer"})
    expect(res.status).toBe(201)
    expect(registerUser).toHaveBeenCalledWith({username:"user", email:"user@example.com", password:"pass", role:"buyer"})
  })

  it("handles conflict when user exists", async () => {
    registerUser.mockRejectedValue(new Error("User already exists"))
    const res = await request(app)
      .post("/register")
      .send({username:"user", email:"user@example.com", password:"pass", role:"buyer"})
    expect(res.status).toBe(409)
  })

  it("handles internal errors", async () => {
    registerUser.mockRejectedValue(new Error("boom"))
    const res = await request(app)
      .post("/register")
      .send({username:"user", email:"user@example.com", password:"pass", role:"buyer"})
    expect(res.status).toBe(500)
    expect(res.body.error).toBeDefined()
  })
})
