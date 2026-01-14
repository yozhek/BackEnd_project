import express from "express"
import {sendTelegramMessage} from "./telegram.js"
import type {NotifyRequest, NotifyPayload} from "./types"
import {removeBinding, getBinding, getBindingByChat, saveBinding, createPending, consumePending} from "./store.js"

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

app.get("/health", (_req,res) => {
  res.status(200).json({status:"ok"})
})

app.post("/notify", async (req,res) => {
  const body = req.body as NotifyRequest
  if (!body?.type || !body?.payload) return res.status(400).json({error:"Invalid payload"})
  await handleNotify({type: body.type, ...(body.payload || {})} as any)
  res.status(202).json({status:"queued"})
})

app.post("/auth/telegram/jwt", (req,res) => {
  const userId = req.body?.userId
  if (!userId || typeof userId !== "string") return res.status(400).json({error:"userId required"})
  const pending = createPending(userId)
  const token = pending.token
  const botUser = process.env.TELEGRAM_BOT_USERNAME || ""
  const link = botUser ? `https://t.me/${botUser}?start=${token}` : token
  res.status(200).json({token, link, expiresIn: 600})
})

app.get("/auth/telegram/binding", (req,res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined
  if (!userId) return res.status(400).json({error:"userId required"})
  const binding = getBinding(userId)
  if (!binding) return res.status(404).json({error:"not found"})
  res.status(200).json(binding)
})

app.post("/auth/telegram/bot-callback", (req,res) => {
  const {token, chatId, username} = req.body || {}
  if (!token || !chatId) return res.status(400).json({error:"token and chatId required"})
  const existingByChat = getBindingByChat(String(chatId))
  if (existingByChat) return res.status(409).json({error:"This Telegram is already linked to another account"})
  const userId = consumePending(String(token))
  if (!userId) return res.status(400).json({error:"invalid or expired token"})
  const binding = saveBinding(userId, String(chatId), typeof username === "string" ? username : undefined)
  res.status(200).json(binding || {})
})

app.delete("/auth/telegram/binding", async (req,res) => {
  const userId = req.body?.userId
  if (!userId || typeof userId !== "string") return res.status(400).json({error:"userId required"})
  const existing = getBinding(userId)
  if (existing) {
    await sendTelegramMessage("Your Telegram account was unlinked from BleskShop.", userId)
  }
  removeBinding(userId)
  res.status(existing ? 200 : 204).json(existing || {})
})

async function handleNotify(req: NotifyPayload) {
  switch (req.type) {
    case "auction_created":
      await sendTelegramMessage(
        `New auction published by ${req.sellerName || req.sellerId}\n${req.productTitle}\nStart price: $${req.startPrice}\nEnds: ${req.endsAt}`,
        req.sellerId
      )
      break
    case "bid_placed":
      await sendTelegramMessage(
        `Your bid placed: $${req.amount} on ${req.productTitle}`,
        req.bidderId
      )
      break
    case "outbid":
      await sendTelegramMessage(
        `You have been outbid on ${req.productTitle}. New bid: $${req.amount}`,
        req.bidderId
      )
      break
    case "auction_won":
      await sendTelegramMessage(
        `You won ${req.productTitle} with $${req.amount}. Please pay within 24h.`,
        req.bidderId
      )
      break
    case "auction_closed":
      await sendTelegramMessage(
        `Auction closed: ${req.productTitle}\nFinal: $${req.finalPrice}\nWinner: ${req.winnerName || "n/a"}`,
        req.sellerId
      )
      break
  }
}

const port = process.env.PORT || 4005
app.listen(port, () => console.log(`Notification service running on ${port}`))
