import {getDb} from "../database/mongo"
import {ObjectId} from "mongodb"
import type {OrderCreateDTO,OrderUpdateDTO,OrderStatus,OrderItemDTO} from "../types/dto/order.dto"

type OrderDoc = {
  customerName: string
  items: OrderItemDTO[]
  totalPrice: number
  status: OrderStatus
  createdAt: Date
  updatedAt: Date
}

function mapOrder(doc: any) {
  return {
    id: doc._id?.toString(),
    customerName: doc.customerName,
    items: doc.items,
    totalPrice: doc.totalPrice,
    status: doc.status
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
  const priceById = new Map<string, number>()
  products.forEach(p => {
    const price = typeof p.discountedPrice === "number" ? p.discountedPrice : p.price
    if (!Number.isFinite(price)) throw {status:400, message:"invalid product price"}
    priceById.set(p._id.toString(), price)
  })
  return priceById
}

function sumItems(items: OrderItemDTO[], priceById: Map<string, number>) {
  let total = 0
  items.forEach(it => {
    const price = priceById.get(it.productId)
    if (price === undefined || !Number.isFinite(price)) throw {status:400, message:"product not found"}
    total += price * it.quantity
  })
  if (!Number.isFinite(total)) throw {status:400, message:"invalid total"}
  return Number(total.toFixed(2))
}

async function ensureProductsAndTotal(items: OrderItemDTO[]) {
  const ids = parseProductIds(items)
  const priceById = await loadProductPrices(ids)
  return sumItems(items, priceById)
}

export async function createOrder(dto: OrderCreateDTO) {
  const db = getDb()
  const now = new Date()
  const totalPrice = await ensureProductsAndTotal(dto.items)
  const doc: OrderDoc = {
    customerName: dto.customerName,
    items: dto.items,
    totalPrice,
    status: dto.status,
    createdAt: now,
    updatedAt: now
  }
  const res = await db.collection("orders").insertOne(doc)
  return mapOrder({_id: res.insertedId, ...doc})
}

export async function getOrderById(id: string) {
  const db = getDb()
  let _id
  try { _id = new ObjectId(id) } catch { return null }
  const doc = await db.collection("orders").findOne({_id})
  return doc ? mapOrder(doc) : null
}

export async function listOrders(page: number, limit: number) {
  const db = getDb()
  const skip = Math.max(0, (page - 1) * limit)
  const cursor = db.collection("orders").find({}).sort({createdAt:-1}).skip(skip).limit(limit)
  const docs = await cursor.toArray()
  return docs.map(mapOrder)
}

export async function updateOrder(id: string, patch: OrderUpdateDTO) {
  const db = getDb()
  let _id
  try { _id = new ObjectId(id) } catch { return null }
  const existing = await db.collection("orders").findOne({_id})
  if (!existing) return null
  const totalPrice = patch.items ? await ensureProductsAndTotal(patch.items) : existing.totalPrice
  const toSet = {
    customerName: patch.customerName ?? existing.customerName,
    items: patch.items ?? existing.items,
    totalPrice,
    status: patch.status ?? existing.status,
    updatedAt: new Date()
  }
  await db.collection("orders").updateOne({_id}, {$set: toSet})
  return mapOrder({_id, ...toSet})
}

export async function deleteOrder(id: string) {
  const db = getDb()
  let _id
  try { _id = new ObjectId(id) } catch { return false }
  const res = await db.collection("orders").deleteOne({_id})
  return res.deletedCount === 1
}
