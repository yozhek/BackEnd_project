import {getDb} from "../database/mongo"
import type {ProductCreateDTO} from "../types/dto/product.dto"
import {ObjectId} from "mongodb"
import type {ProductUpdateDTO} from "../types/dto/product.dto"

type ProductDoc = {
  _id?: ObjectId
  title: string
  price: number
  discountPercent: number
  discountedPrice: number
  category: string
  description: string
  imageBase64?: string
  ownerId?: string
  ownerName?: string
  isAuction?: boolean
  createdAt: Date
  updatedAt: Date
}

export async function createProduct(dto: ProductCreateDTO, owner?: {id?: string, name?: string}) {
  const db = getDb()
  const doc = buildProductDoc(dto, owner)
  const res = await db.collection<ProductDoc>("products").insertOne(doc)
  return mapProduct({_id: res.insertedId, ...doc})
}

function mapProduct(doc: any) {
  return {
    id: doc._id?.toString(),
    title: doc.title,
    price: doc.price,
    discountPercent: doc.discountPercent ?? 0,
    discountedPrice: doc.discountedPrice ?? doc.price,
    category: doc.category,
    description: doc.description ?? "",
    imageBase64: doc.imageBase64,
    ownerId: doc.ownerId,
    ownerName: doc.ownerName,
    isAuction: doc.isAuction
  }
}

export async function getProductById(id: string) {
  const db = getDb()
  let _id
  try { _id = new ObjectId(id) } catch { return null }
  const doc = await db.collection<ProductDoc>("products").findOne({_id})
  return doc ? mapProduct(doc) : null
}

export async function listProducts(page: number, limit: number, ownerId?: string) {
  const db = getDb()
  const skip = Math.max(0, (page - 1) * limit)
  const filter = ownerId ? {ownerId} : {}
  const cursor = db.collection<ProductDoc>("products").find(filter).sort({createdAt:-1}).skip(skip).limit(limit)
  const docs = await cursor.toArray()
  return docs.map(mapProduct)
}




export async function updateProduct(id: string, patch: ProductUpdateDTO, userId?: string) {
  const db = getDb()
  let _id
  try { _id = new ObjectId(id) } catch { return null }
  const existing = await db.collection<ProductDoc>("products").findOne({_id})
  if (!existing) return null
  if (existing.ownerId && userId && existing.ownerId !== userId) return {forbidden:true} as any
  const title = patch.title ?? existing.title
  const price = patch.price ?? existing.price
  const discountPercent = patch.discountPercent ?? (existing.discountPercent ?? 0)
  const discountedPrice = calcDiscountedPrice(price, discountPercent)
  const description = patch.description ?? (existing.description ?? "")
  const imageBase64 = patch.imageBase64 ?? existing.imageBase64
  await db.collection("products").updateOne({_id},{
    $set:{
      title,
      price,
      discountPercent,
      discountedPrice,
      category: patch.category ?? existing.category,
      description,
      imageBase64,
      isAuction: typeof patch.isAuction === "boolean" ? patch.isAuction : existing.isAuction,
      updatedAt:new Date()
    }
  })
  return {
    id,
    title,
    price,
    discountPercent,
    discountedPrice,
    category: patch.category ?? existing.category,
    description,
    imageBase64,
    ownerId: existing.ownerId,
    ownerName: existing.ownerName,
    isAuction: typeof patch.isAuction === "boolean" ? patch.isAuction : existing.isAuction
  }
}

export async function deleteProduct(id: string, userId?: string) {
  const db = getDb()
  let _id
  try { _id = new ObjectId(id) } catch { return false }
  if (userId) {
    const existing = await db.collection<ProductDoc>("products").findOne({_id})
    if (!existing || (existing.ownerId && existing.ownerId !== userId)) return false
  }
  const res = await db.collection("products").deleteOne({_id})
  return res.deletedCount === 1
}

function calcDiscountedPrice(price: number, discountPercent: number) {
  return Number((price * (1 - discountPercent / 100)).toFixed(2))
}

function buildProductDoc(dto: ProductCreateDTO, owner?: {id?: string, name?: string}): ProductDoc {
  return {
    title: dto.title,
    price: dto.price,
    discountPercent: dto.discountPercent,
    discountedPrice: calcDiscountedPrice(dto.price, dto.discountPercent),
    category: dto.category,
    description: dto.description,
    imageBase64: dto.imageBase64,
    isAuction: dto.isAuction ?? false,
    ownerId: owner?.id,
    ownerName: owner?.name,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}
