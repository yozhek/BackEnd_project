import {getDb} from "../database/mongo"
import type {ProductCreateDTO} from "../types/dto/product.dto"

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
