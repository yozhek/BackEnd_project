import {readNonEmptyString,readNumber,hasProp} from "./validation.helpers"

export type ProductCreateDTO = {
  title: string
  price: number
  discountPercent: number
  category: string
  description: string
  imageBase64?: string
  isAuction?: boolean
}

function readDiscount(v: any, present: boolean, errors: string[]) {
  if (!present) return 0
  const n = typeof v === "number" ? v : Number(v)
  if (!Number.isFinite(n)) errors.push("discountPercent must be a number")
  else if (n <= 0 || n > 100) errors.push("discountPercent must be > 0 and <= 100")
  return n
}

export function validateProductCreate(input: any): {value?: ProductCreateDTO, errors?: string[]} {
  const errors: string[] = []
  const title = readNonEmptyString(input?.title, "title", errors)
  const price = readNumber(input?.price, "price", errors, {min: 0})
  const hasDiscount = hasProp(input, "discountPercent")
  const discountPercent = readDiscount(input?.discountPercent, hasDiscount, errors)
  const category = readNonEmptyString(input?.category, "category", errors)
  const description = readNonEmptyString(input?.description, "description", errors)
  let imageBase64: string|undefined
  if (typeof input?.imageBase64 !== "undefined") {
    imageBase64 = readNonEmptyString(input.imageBase64, "imageBase64", errors)
  }
  const isAuction = typeof input?.isAuction === "boolean" ? input.isAuction : false
  if (errors.length) return {errors}
  return {value: {title, price, discountPercent, category, description, imageBase64, isAuction}}
}



export type ProductUpdateDTO = {
  title?: string
  price?: number
  discountPercent?: number
  category?: string
  description?: string
  imageBase64?: string
  isAuction?: boolean
}

export function validateProductUpdate(input: any): {value?: ProductUpdateDTO, errors?: string[]} {
  const errors: string[] = []
  const out: ProductUpdateDTO = {}
  if (typeof input?.title !== "undefined") out.title = readNonEmptyString(input.title, "title", errors)
  if (typeof input?.price !== "undefined") out.price = readNumber(input.price, "price", errors, {min: 0})
  const hasDiscount = hasProp(input || {}, "discountPercent")
  if (hasDiscount) out.discountPercent = readDiscount(input.discountPercent, true, errors)
  if (typeof input?.category !== "undefined") out.category = readNonEmptyString(input.category, "category", errors)
  if (typeof input?.description !== "undefined") out.description = readNonEmptyString(input.description, "description", errors)
  if (typeof input?.imageBase64 !== "undefined") out.imageBase64 = readNonEmptyString(input.imageBase64, "imageBase64", errors)
  if (!Object.keys(out).length) errors.push("no valid fields to update")
  if (errors.length) return {errors}
  return {value: out}
}
