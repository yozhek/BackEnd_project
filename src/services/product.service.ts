import {getDb} from "../database/mongo"
import type {ProductCreateDTO} from "../types/dto/product.dto"
import {ObjectId} from "mongodb"

export async function createProduct(dto: ProductCreateDTO) {
  const db = getDb()
  const discountedPrice = Number((dto.price * (1 - dto.discountPercent / 100)).toFixed(2))
  const doc = {
    title: dto.title,
    price: dto.price,
    discountPercent: dto.discountPercent,
    discountedPrice,
    category: dto.category,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  const res = await db.collection("products").insertOne(doc)
  return {
    id: res.insertedId.toString(),
    title: dto.title,
    price: dto.price,
    discountPercent: dto.discountPercent,
    discountedPrice,
    category: dto.category
  }
}

function mapProduct(doc: any) {
  return {
    id: doc._id?.toString(),
    title: doc.title,
    price: doc.price,
    discountPercent: doc.discountPercent ?? 0,
    discountedPrice: doc.discountedPrice ?? doc.price,
    category: doc.category
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
