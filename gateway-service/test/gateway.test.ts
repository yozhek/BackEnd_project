import {describe,it,expect} from "vitest"
import request from "supertest"
import {startServer} from "../src/api/server"
import WebSocket from "ws"

describe("gateway service", () => {
  it("responds to health", async () => {
    const {httpServer, stop} = await startServer(0)
    const res = await request(httpServer).get("/health")
    expect(res.status).toBe(200)
    await stop()
  })

  it("broadcasts incoming events to websockets", async () => {
    const {httpServer, stop} = await startServer(0)
    const address = httpServer.address()
    const port = typeof address === "object" && address ? address.port : 0
    const ws = new WebSocket(`ws://localhost:${port}/ws?auctionId=a1`)

    await waitForOpen(ws)

    const messagePromise = waitForMessage(ws, 1000)

    const post = request(httpServer)
      .post("/events")
      .send({type:"bid", payload:{auctionId:"a1", amount:100}})
      .set("Content-Type","application/json")
    await post.expect(202)

    const message = await messagePromise
    expect(message.type).toBe("bid")
    expect(message.payload.amount).toBe(100)
    ws.close()
    await stop()
  })
})

function waitForOpen(ws: WebSocket) {
  return new Promise<void>((resolve,reject) => {
    ws.on("open", () => resolve())
    ws.on("error", err => reject(err))
  })
}

function waitForMessage(ws: WebSocket, timeout: number) {
  return new Promise<any>((resolve,reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeout)
    ws.on("message", data => {
      clearTimeout(timer)
      try {
        resolve(JSON.parse(data.toString()))
      } catch (e) {
        reject(e)
      }
    })
    ws.on("error", err => reject(err))
  })
}
