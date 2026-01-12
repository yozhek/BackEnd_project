import {WebSocketServer, WebSocket} from "ws"

export type Hub = {
  broadcastEvent: (event: any) => void
  close: () => Promise<void>
}

export function createHub(server: import("http").Server): Hub {
  const wss = new WebSocketServer({server, path: "/ws"})
  const clients = new Set<{socket: WebSocket, auctionId?: string}>()

  wss.on("connection", (socket, req) => {
    const url = new URL(req.url || "", "http://localhost")
    const auctionId = url.searchParams.get("auctionId") || undefined
    const client = {socket, auctionId}
    clients.add(client)

    socket.on("message", msg => {
      safeSend(socket, {type: "echo", payload: msg.toString()})
    })

    socket.on("close", () => {
      clients.delete(client)
    })
  })

  function broadcastEvent(event: any) {
    const targetAuction = event?.payload?.auctionId
    clients.forEach(c => {
      if (targetAuction && c.auctionId && c.auctionId !== targetAuction) return
      safeSend(c.socket, event)
    })
  }

  function close(): Promise<void> {
    clients.forEach(c => c.socket.close())
    clients.clear()
    return new Promise(resolve => {
      wss.close(() => resolve())
    })
  }

  return {broadcastEvent, close}
}

function safeSend(ws: WebSocket, data: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data))
  }
}
