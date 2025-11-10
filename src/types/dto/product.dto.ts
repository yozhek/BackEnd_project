export type ProductCreateDTO = {
  title: string
  price: number
  discountPercent: number
  category: string
}

export function validateProductCreate(input: any): {value?: ProductCreateDTO, errors?: string[]} {
  const errors: string[] = []

  const title = typeof input?.title === "string" ? input.title.trim() : ""
  if (!title) errors.push("title must be a non-empty string")

  const priceRaw = input?.price
  const priceNum = typeof priceRaw === "number" ? priceRaw : Number(priceRaw)
  if (!Number.isFinite(priceNum)) errors.push("price must be a number")
  else if (priceNum < 0) errors.push("price must be >= 0")

  const hasDiscount = input && Object.prototype.hasOwnProperty.call(input, "discountPercent")
  let discountNum = 0
  if (hasDiscount) {
    const discountRaw = input.discountPercent
    discountNum = typeof discountRaw === "number" ? discountRaw : Number(discountRaw)
    if (!Number.isFinite(discountNum)) errors.push("discountPercent must be a number")
    else if (discountNum <= 0 || discountNum > 100) errors.push("discountPercent must be > 0 and <= 100")
  }

  const category = typeof input?.category === "string" ? input.category.trim() : ""
  if (!category) errors.push("category must be a non-empty string")

  if (errors.length) return {errors}

  return {value: {title, price: priceNum, discountPercent: discountNum, category}}
}



export type ProductUpdateDTO = {
  title?: string
  price?: number
  discountPercent?: number
  category?: string
}

export function validateProductUpdate(input: any): {value?: ProductUpdateDTO, errors?: string[]} {
  const errors: string[] = []
  const out: ProductUpdateDTO = {}

  if (typeof input?.title !== "undefined") {
    const title = typeof input.title === "string" ? input.title.trim() : ""
    if (!title) errors.push("title must be a non-empty string")
    else out.title = title
  }

  if (typeof input?.price !== "undefined") {
    const priceNum = typeof input.price === "number" ? input.price : Number(input.price)
    if (!Number.isFinite(priceNum) || priceNum < 0) errors.push("price must be a number >= 0")
    else out.price = priceNum
  }

  if (Object.prototype.hasOwnProperty.call(input || {}, "discountPercent")) {
    const discountNum = typeof input.discountPercent === "number" ? input.discountPercent : Number(input.discountPercent)
    if (!Number.isFinite(discountNum) || discountNum <= 0 || discountNum > 100) errors.push("discountPercent must be > 0 and <= 100")
    else out.discountPercent = discountNum
  }

  if (typeof input?.category !== "undefined") {
    const category = typeof input.category === "string" ? input.category.trim() : ""
    if (!category) errors.push("category must be a non-empty string")
    else out.category = category
  }

  if (!Object.keys(out).length) errors.push("no valid fields to update")

  if (errors.length) return {errors}
  return {value: out}
}
