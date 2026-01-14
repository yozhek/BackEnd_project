import request from "supertest"
import {describe,it,expect,vi,beforeEach} from "vitest"
import {app} from "../src/app.js"
import {sendTelegramMessage} from "../src/telegram.js"

const tgMock = sendTelegramMessage as unknown as ReturnType<typeof vi.fn>

describe("notification service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns health", async () => {
    const res = await request(app).get("/health")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({status:"ok"})
  })

  it("rejects invalid notify payload", async () => {
    const res = await request(app).post("/notify").send({})
    expect(res.status).toBe(400)
  })

  it("processes notify payload", async () => {
    const res = await request(app).post("/notify").send({
      type: "bid_placed",
      payload: {auctionId:"a1", bidderId:"u1", bidderName:"User", amount:123, productTitle:"Item"}
    })
    expect(res.status).toBe(202)
    expect(tgMock).toHaveBeenCalled()
  })

  it("validates telegram jwt request", async () => {
    const bad = await request(app).post("/auth/telegram/jwt").send({})
    expect(bad.status).toBe(400)
  })

  it("creates pending token and returns link", async () => {
    const res = await request(app).post("/auth/telegram/jwt").send({userId:"user-1"})
    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
    expect(res.body.link).toBeDefined()
  })

  it("returns 404 when binding not found", async () => {
    const res = await request(app).get("/auth/telegram/binding?userId=nope")
    expect(res.status).toBe(404)
  })

  it("completes binding via bot callback and fetches it", async () => {
    const init = await request(app).post("/auth/telegram/jwt").send({userId:"user-2"})
    const token = init.body.token
    const cb = await request(app).post("/auth/telegram/bot-callback").send({token, chatId:"123", username:"tester"})
    expect(cb.status).toBe(200)
    expect(cb.body.userId).toBe("user-2")
    const binding = await request(app).get("/auth/telegram/binding?userId=user-2")
    expect(binding.status).toBe(200)
    expect(binding.body.chatId).toBe("123")
  })

  it("still rejects duplicate chat binding without unlink", async () => {
    const init1 = await request(app).post("/auth/telegram/jwt").send({userId:"user-3"})
    await request(app).post("/auth/telegram/bot-callback").send({token: init1.body.token, chatId:"222"})
    const init2 = await request(app).post("/auth/telegram/jwt").send({userId:"user-4"})
    const dup = await request(app).post("/auth/telegram/bot-callback").send({token: init2.body.token, chatId:"222"})
    expect(dup.status).toBe(409)
  })

  it("rejects invalid token on bot callback", async () => {
    const res = await request(app).post("/auth/telegram/bot-callback").send({token:"bad", chatId:"999"})
    expect(res.status).toBe(400)
  })

  it("deletes binding and notifies unlink", async () => {
    const init = await request(app).post("/auth/telegram/jwt").send({userId:"user-5"})
    await request(app).post("/auth/telegram/bot-callback").send({token: init.body.token, chatId:"777"})
    const del = await request(app).delete("/auth/telegram/binding").send({userId:"user-5"})
    expect(del.status).toBe(200)
    expect(tgMock).toHaveBeenCalled()
    const get = await request(app).get("/auth/telegram/binding?userId=user-5")
    expect(get.status).toBe(404)
  })

  it("returns 204 when deleting non-existent binding", async () => {
    const res = await request(app).delete("/auth/telegram/binding").send({userId:"no-binding"})
    expect(res.status).toBe(204)
  })

  it("unlinks via bot chat command", async () => {
    const init = await request(app).post("/auth/telegram/jwt").send({userId:"user-6"})
    await request(app).post("/auth/telegram/bot-callback").send({token: init.body.token, chatId:"333"})
    const unlink = await request(app).post("/auth/telegram/bot-unlink").send({chatId:"333"})
    expect(unlink.status).toBe(200)
    const binding = await request(app).get("/auth/telegram/binding?userId=user-6")
    expect(binding.status).toBe(404)
  })
})
