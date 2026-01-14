import fetch from "node-fetch"
import {getBinding} from "./store.js"

const botToken = process.env.TELEGRAM_BOT_TOKEN

function chatFor(userId?: string) {
  const binding = getBinding(userId)
  return binding?.chatId || ""
}

export async function sendTelegramMessage(text: string, targetUserId?: string) {
  if (!botToken) return
  const chatId = chatFor(targetUserId)
  if (!chatId) return
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  const body = {chat_id: chatId, text}
  try {
    const res = await fetch(url, {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      console.warn("Telegram send failed", res.status, await res.text())
    }
  } catch (err) {
    console.warn("Telegram send error", (err as Error)?.message || err)
  }
}
