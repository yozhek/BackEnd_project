import {getDb} from "../database/mongo"
import {ObjectId} from "mongodb"
import type {OrderCreateDTO,OrderUpdateDTO,OrderStatus,OrderItemDTO} from "../types/dto/order.dto"

type OrderDoc = {
  items: Array<OrderItemDTO & {productTitle?: string, productPrice?: number}>
  totalPrice: number
  status: OrderStatus
  buyerId?: string
  buyerName?: string
  buyerEmail?: string
  createdAt: Date
  updatedAt: Date
}

function mapOrder(doc: any) {
  return {
    id: doc._id?.toString(),
    items: doc.items?.map((it: any) => ({
      productId: it.productId,
      quantity: it.quantity,
      productTitle: it.productTitle,
      productPrice: it.productPrice
    })),
    totalPrice: doc.totalPrice,
    status: doc.status,
    buyerId: doc.buyerId,
    buyerName: doc.buyerName,
    buyerEmail: doc.buyerEmail
  }
}

function parseProductIds(items: OrderItemDTO[]) {
  const ids: ObjectId[] = []
  items.forEach(it => {
    try { ids.push(new ObjectId(it.productId)) }
    catch { throw {status:400, message:"invalid product id"} }
  })
  return ids
}

async function loadProductPrices(ids: ObjectId[]) {
  const db = getDb()
  const products = await db.collection("products").find({_id: {$in: ids}}).toArray()
  if (products.length !== ids.length) throw {status:400, message:"product not found"}
  const infoById = new Map<string, {price: number, title: string}>()
  products.forEach(p => {
    const price = typeof p.discountedPrice === "number" ? p.discountedPrice : p.price
    if (!Number.isFinite(price)) throw {status:400, message:"invalid product price"}
    infoById.set(p._id.toString(), {price, title: p.title || ""})
  })
  return infoById
}

function sumItems(items: OrderItemDTO[], infoById: Map<string, {price:number,title:string}>) {
  let total = 0
  items.forEach(it => {
    const info = infoById.get(it.productId)
    const price = info?.price
    if (price === undefined || !Number.isFinite(price)) throw {status:400, message:"product not found"}
    total += price * it.quantity
  })
  if (!Number.isFinite(total)) throw {status:400, message:"invalid total"}
  return Number(total.toFixed(2))
}

async function ensureProductsAndTotal(items: OrderItemDTO[]) {
  const ids = parseProductIds(items)
  const infoById = await loadProductPrices(ids)
  const totalPrice = sumItems(items, infoById)
  const itemsWithTitles = items.map(it => {
    const info = infoById.get(it.productId)
    return {...it, productTitle: info?.title, productPrice: info?.price}
  })
  return {totalPrice, items: itemsWithTitles}
}

export async function createOrder(dto: OrderCreateDTO, buyer?: {id?: string, name?: string, email?: string}) {
  const db = getDb()
  const now = new Date()
  const {totalPrice, items} = await ensureProductsAndTotal(dto.items)
  const doc: OrderDoc = {
    items,
    totalPrice,
    status: dto.status,
    buyerId: buyer?.id,
    buyerName: buyer?.name,
    buyerEmail: buyer?.email,
    createdAt: now,
    updatedAt: now
  }
  const res = await db.collection<OrderDoc>("orders").insertOne(doc)
  return mapOrder({_id: res.insertedId, ...doc})
}

export async function getOrderById(id: string, buyerId?: string) {
  const db = getDb()
  let _id
  try { _id = new ObjectId(id) } catch { return null }
  const filter: any = {_id}
  if (buyerId) filter.buyerId = buyerId
  const doc = await db.collection<OrderDoc>("orders").findOne(filter)
  return doc ? mapOrder(doc) : null
}

export async function listOrders(page: number, limit: number, buyerId?: string) {
  const db = getDb()
  const skip = Math.max(0, (page - 1) * limit)
  const filter = buyerId ? {buyerId} : {}
  const cursor = db.collection<OrderDoc>("orders").find(filter).sort({createdAt:-1}).skip(skip).limit(limit)
  const docs = await cursor.toArray()
  return docs.map(mapOrder)
}

export async function updateOrder(id: string, patch: OrderUpdateDTO, buyerId?: string) {
  const db = getDb()
  const existing = await loadOrder(id, db)
  if (!existing) return null
  if (isForbiddenBuyer(existing, buyerId)) return {forbidden:true} as any
  const enriched = patch.items ? await ensureProductsAndTotal(patch.items) : null
  const updated = mergeOrderPatch(existing, patch, enriched)
  await db.collection("orders").updateOne({_id: existing._id!}, {$set: updated.dbSet})
  return mapOrder({_id: existing._id, ...updated.dbSet})
}

export async function deleteOrder(id: string, buyerId?: string) {
  const db = getDb()
  let _id
  try { _id = new ObjectId(id) } catch { return false }
  if (buyerId) {
    const existing = await db.collection<OrderDoc>("orders").findOne({_id})
    if (!existing || (existing.buyerId && existing.buyerId !== buyerId)) return false
  }
  const res = await db.collection("orders").deleteOne({_id})
  return res.deletedCount === 1
}

async function loadOrder(id: string, db: ReturnType<typeof getDb>) {
  try { return await db.collection<OrderDoc>("orders").findOne({_id: new ObjectId(id)}) }
  catch { return null }
}

function isForbiddenBuyer(existing: OrderDoc, buyerId?: string) {
  return !!(buyerId && existing.buyerId && existing.buyerId !== buyerId)
}

function mergeOrderPatch(existing: OrderDoc & {_id?: ObjectId}, patch: OrderUpdateDTO, enriched: {items:any[], totalPrice:number} | null) {
  const items = enriched ? enriched.items : existing.items
  const totalPrice = enriched ? enriched.totalPrice : existing.totalPrice
  const status = patch.status ?? existing.status
  const dbSet = {
    items,
    totalPrice,
    status,
    buyerId: existing.buyerId,
    buyerName: existing.buyerName,
    buyerEmail: existing.buyerEmail,
    updatedAt: new Date()
  }
  return {dbSet}
}
