import {getDb} from "../database/mongo"
import type {ProductCreateDTO} from "../types/dto/product.dto"
import {ObjectId} from "mongodb"
import type {ProductUpdateDTO} from "../types/dto/product.dto"

export async function createProduct(dto: ProductCreateDTO) {
  const db = getDb()
  const doc = buildProductDoc(dto)
  const res = await db.collection("products").insertOne(doc)
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
    imageBase64: doc.imageBase64
  }
}

export async function getProductById(id: string) {
  const db = getDb()
  let _id
  try { _id = new ObjectId(id) } catch { return null }
  const doc = await db.collection("products").findOne({_id})
  return doc ? mapProduct(doc) : null
}

export async function listProducts(page: number, limit: number) {
  const db = getDb()
  const skip = Math.max(0, (page - 1) * limit)
  const cursor = db.collection("products").find({}).sort({createdAt:-1}).skip(skip).limit(limit)
  const docs = await cursor.toArray()
  return docs.map(mapProduct)
}




export async function updateProduct(id: string, patch: ProductUpdateDTO) {
  const db = getDb()
  let _id
  try { _id = new ObjectId(id) } catch { return null }
  const existing = await db.collection("products").findOne({_id})
  if (!existing) return null
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
    imageBase64
  }
}

export async function deleteProduct(id: string) {
  const db = getDb()
  let _id
  try { _id = new ObjectId(id) } catch { return false }
  const res = await db.collection("products").deleteOne({_id})
  return res.deletedCount === 1
}

function calcDiscountedPrice(price: number, discountPercent: number) {
  return Number((price * (1 - discountPercent / 100)).toFixed(2))
}

function buildProductDoc(dto: ProductCreateDTO) {
  return {
    title: dto.title,
    price: dto.price,
    discountPercent: dto.discountPercent,
    discountedPrice: calcDiscountedPrice(dto.price, dto.discountPercent),
    category: dto.category,
    description: dto.description,
    imageBase64: dto.imageBase64,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}
