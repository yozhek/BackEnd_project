import express from "express"
import {createServer} from "http"
import {createHub} from "../ws/hub"
import {handleIncoming} from "../services/eventBus"
import {swaggerMiddleware} from "../docs/swagger"

export async function startServer(port: number) {
  const app = express()
  const httpServer = createServer(app)
  const hub = createHub(httpServer)

  app.use(express.json({limit:"1mb"}))

  app.use("/docs", ...swaggerMiddleware())

  app.get("/health", (_req,res) => {
    res.status(200).json({status:"ok"})
  })

  app.post("/events", (req,res) => {
    const result = handleIncoming(req.body, hub.broadcastEvent)
    if (!result.ok) return res.status(400).json({error: result.error})
    res.status(202).json({status:"accepted"})
  })

  await new Promise<void>(resolve => {
    httpServer.listen(port, () => {
      const addr = httpServer.address()
      const p = typeof addr === "object" && addr ? addr.port : port
      console.log(`Gateway listening on ${p}`)
      resolve()
    })
  })

  const stop = async () => {
    await hub.close()
    await new Promise<void>(resolve => httpServer.close(() => resolve()))
  }

  return {app, httpServer, hub, stop}
}
