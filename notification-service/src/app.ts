import express from "express"
import {sendTelegramMessage} from "./telegram.js"
import type {NotifyRequest, NotifyPayload} from "./types"
import {removeBinding, removeBindingByChat, getBinding, getBindingByChat, saveBinding, createPending, consumePending} from "./store.js"
import {swaggerMiddleware} from "./docs/swagger.js"

const app = express()
app.use(express.json({limit:"1mb"}))
app.use((req,res,next) => {
  const origin = req.headers.origin || "*"
  res.header("Access-Control-Allow-Origin", origin)
  res.header("Vary","Origin")
  res.header("Access-Control-Allow-Methods","GET,POST,DELETE,OPTIONS")
  res.header("Access-Control-Allow-Headers","Content-Type, Authorization, Accept")
  if (req.method === "OPTIONS") return res.sendStatus(204)
  next()
})

app.use("/docs", ...swaggerMiddleware())

app.get("/health", (_req,res) => {
  res.status(200).json({status:"ok"})
})

app.post("/notify", async (req,res) => {
  const body = req.body as NotifyRequest
  if (!isNonEmptyString(body?.type) || !isObject(body?.payload)) {
    return res.status(400).json({error:"Invalid payload"})
  }
  await handleNotify({type: body.type, ...(body.payload || {})} as any)
  res.status(202).json({status:"queued"})
})

app.post("/auth/telegram/jwt", (req,res) => {
  const userId = req.body?.userId
  if (!isNonEmptyString(userId)) return res.status(400).json({error:"userId required"})
  const pending = createPending(userId)
  const token = pending.token
  const botUser = process.env.TELEGRAM_BOT_USERNAME || ""
  const link = botUser ? `https://t.me/${botUser}?start=${token}` : token
  res.status(200).json({token, link, expiresIn: 600})
})

app.get("/auth/telegram/binding", (req,res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined
  if (!isNonEmptyString(userId)) return res.status(400).json({error:"userId required"})
  const binding = getBinding(userId)
  if (!binding) return res.status(404).json({error:"not found"})
  res.status(200).json(binding)
})

app.post("/auth/telegram/bot-callback", (req,res) => {
  const {token, chatId, username} = req.body || {}
  if (!isNonEmptyString(token) || !isNonEmptyString(chatId)) {
    return res.status(400).json({error:"token and chatId required"})
  }
  const existingByChat = getBindingByChat(String(chatId))
  if (existingByChat) return res.status(409).json({error:"This Telegram is already linked to another account"})
  const userId = consumePending(String(token))
  if (!userId) return res.status(400).json({error:"invalid or expired token"})
  const binding = saveBinding(userId, String(chatId), typeof username === "string" ? username : undefined)
  res.status(200).json(binding || {})
})

app.delete("/auth/telegram/binding", async (req,res) => {
  const userId = req.body?.userId
  if (!isNonEmptyString(userId)) return res.status(400).json({error:"userId required"})
  const existing = getBinding(userId)
  if (existing) {
    await sendTelegramMessage("Your Telegram account was unlinked from BleskShop.", userId)
  }
  removeBinding(userId)
  res.status(existing ? 200 : 204).json(existing || {})
})

app.post("/auth/telegram/bot-unlink", (req,res) => {
  const chatId = req.body?.chatId
  if (!isNonEmptyString(chatId)) return res.status(400).json({error:"chatId required"})
  const removed = removeBindingByChat(String(chatId))
  if (!removed) return res.status(204).json({status:"no binding"})
  res.status(200).json({status:"unlinked", userId: removed.userId})
})

async function handleNotify(req: NotifyPayload) {
  const handler = notifyHandlers[req.type]
  if (!handler) return
  await handler(req as any)
}

const port = process.env.PORT || 4005

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`Notification service running on ${port}`))
}

export {app}

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0
}

function isObject(v: any) {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

type HandlerMap = {
  [K in NotifyPayload["type"]]: (req: Extract<NotifyPayload, {type: K}>) => Promise<void>
}

const notifyHandlers: HandlerMap = {
  auction_created: async req => {
    await sendTelegramMessage(
      `New auction published by ${req.sellerName || req.sellerId}\n${req.productTitle}\nStart price: $${req.startPrice}\nEnds: ${req.endsAt}`,
      req.sellerId
    )
  },
  bid_placed: async req => {
    await sendTelegramMessage(
      `Your bid placed: $${req.amount} on ${req.productTitle}`,
      req.bidderId
    )
  },
  outbid: async req => {
    await sendTelegramMessage(
      `You have been outbid on ${req.productTitle}. New bid: $${req.amount}`,
      req.bidderId
    )
  },
  order_completed: async req => {
    await sendTelegramMessage(
      `Congratulations! You purchased ${req.productTitle} for $${req.amount}. Thank you for your order.`,
      req.bidderId
    )
  },
  auction_won: async req => {
    await sendTelegramMessage(
      `You won ${req.productTitle} with $${req.amount}. Please pay within 24h.`,
      req.bidderId
    )
  },
  auction_closed: async req => {
    await sendTelegramMessage(
      `Auction closed: ${req.productTitle}\nFinal: $${req.finalPrice}\nWinner: ${req.winnerName || "n/a"}`,
      req.sellerId
    )
  }
}
