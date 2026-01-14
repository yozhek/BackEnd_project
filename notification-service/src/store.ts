import {existsSync, mkdirSync, readFileSync, writeFileSync} from "fs"
import {join} from "path"
import {randomUUID} from "crypto"

type Binding = {userId: string, chatId: string, username?: string, linkedAt: string}
type Pending = {token: string, userId: string, createdAt: number}

const dataDir = join(process.cwd(), "data")
const bindingFile = join(dataDir, "bindings.json")
const pendingFile = join(dataDir, "pending.json")

function ensureDir() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, {recursive:true})
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!existsSync(file)) return fallback
    const raw = readFileSync(file, "utf-8")
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(file: string, data: any) {
  ensureDir()
  writeFileSync(file, JSON.stringify(data, null, 2))
}

export function loadBindings(): Binding[] {
  return readJson<Binding[]>(bindingFile, [])
}

export function getBinding(userId?: string) {
  if (!userId) return null
  return loadBindings().find(b => b.userId === userId) || null
}

export function getBindingByChat(chatId?: string) {
  if (!chatId) return null
  return loadBindings().find(b => b.chatId === chatId) || null
}

export function saveBinding(userId: string, chatId: string, username?: string) {
  const list = loadBindings().filter(b => b.userId !== userId)
  list.push({userId, chatId, username, linkedAt: new Date().toISOString()})
  writeJson(bindingFile, list)
  return getBinding(userId)
}

export function removeBinding(userId: string) {
  const list = loadBindings().filter(b => b.userId !== userId)
  writeJson(bindingFile, list)
}

export function removeBindingByChat(chatId: string) {
  const list = loadBindings()
  const found = list.find(b => b.chatId === chatId)
  if (!found) return null
  writeJson(bindingFile, list.filter(b => b.chatId !== chatId))
  return found
}

export function createPending(userId: string): Pending {
  const list = readJson<Pending[]>(pendingFile, []).filter(p => Date.now() - p.createdAt < 10*60*1000)
  const token = randomUUID()
  const entry = {token, userId, createdAt: Date.now()}
  list.push(entry)
  writeJson(pendingFile, list)
  return entry
}

export function consumePending(token: string): string | null {
  const list = readJson<Pending[]>(pendingFile, []).filter(p => Date.now() - p.createdAt < 10*60*1000)
  const found = list.find(p => p.token === token)
  const remaining = list.filter(p => p.token !== token)
  writeJson(pendingFile, remaining)
  return found ? found.userId : null
}
