import TelegramBot from "node-telegram-bot-api"
import fetch from "node-fetch"

const botToken = process.env.TELEGRAM_BOT_TOKEN 
const callbackUrl = process.env.NOTIFY_CALLBACK_URL || "http://notification_service:4005/auth/telegram/bot-callback"

if (!botToken) {
  console.error("TELEGRAM_BOT_TOKEN missing")
  process.exit(1)
}

const bot = new TelegramBot(botToken, {polling: true})


bot.onText(/^\/start\s+(.+)/, async (msg, match) => {
  const token = match?.[1]
  if (!token) {
    await bot   .sendMessage(msg.chat.id, "Token missing, please tap the link in the app.")
    return
  }
  try {
    const res = await fetch(callbackUrl, {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        token,
        chatId: String(msg.chat.id),
        username: msg.from?.username
      })
    })
    if (!res.ok) {
      const txt = await res.text()
      const err = (() => { try { return JSON.parse(txt) } catch { return {} } })()
      if (res.status === 409) {
        await bot.sendMessage(msg.chat.id, "This Telegram is already linked to another BleskShop account.")
        return
      }
      await bot.sendMessage(msg.chat.id, err?.error || "Linking failed.")
      return
    }
    await bot.sendMessage(msg.chat.id, "Telegram linked successfully.")
  } catch (err) {
    console.error(err)
    await bot.sendMessage(msg.chat.id, "Linking failed.")
  }
})

/** @param {{chat:{id:string|number}}} msg */
bot.onText(/^\/start$/, msg => {
  bot.sendMessage(msg.chat.id, "Please use the link button in the app to generate a token.")
})

console.log("Telegram bot started")
