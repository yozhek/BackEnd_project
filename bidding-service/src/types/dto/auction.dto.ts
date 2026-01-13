import {readNonEmptyString,readNumber,hasProp} from "./validation.helpers"

export type AuctionCreateDTO = {
  productId: string
  productTitle: string
  sellerId: string
  sellerName: string
  description?: string
  category?: string
  imageBase64?: string
  startPrice: number
  minIncrement: number
  endsAt: Date
}

export type AuctionBidDTO = {
  bidderId: string
  bidderName: string
  amount: number
}

export type AuctionStatus = "open" | "awaiting_payment" | "closed" | "cancelled"

export function validateAuctionCreate(input: any): {value?: AuctionCreateDTO, errors?: string[]} {
  const errors: string[] = []
  const productId = readNonEmptyString(input?.productId, "productId", errors)
  const productTitle = readNonEmptyString(input?.productTitle, "productTitle", errors)
  const sellerId = input?.sellerId ? readNonEmptyString(input?.sellerId, "sellerId", errors) : undefined
  const sellerName = input?.sellerName ? readNonEmptyString(input?.sellerName, "sellerName", errors) : undefined
  const description = typeof input?.description === "string" ? input.description : undefined
  const category = typeof input?.category === "string" ? input.category : undefined
  const imageBase64 = typeof input?.imageBase64 === "string" ? input.imageBase64 : undefined
  const startPrice = readNumber(input?.startPrice, "startPrice", errors, {min: 0})
  const minIncrement = readNumber(input?.minIncrement, "minIncrement", errors, {min: 0})
  const endsAt = parseDate(input?.endsAt, errors)
  if (endsAt && endsAt.getTime() <= Date.now()) errors.push("endsAt must be in the future")
  if (errors.length) return {errors}
  return {value: {
    productId,
    productTitle,
    sellerId: sellerId || "",
    sellerName: sellerName || "",
    description,
    category,
    imageBase64,
    startPrice,
    minIncrement,
    endsAt: endsAt!
  }}
}

export function validateAuctionBid(input: any): {value?: AuctionBidDTO, errors?: string[]} {
  const errors: string[] = []
  const bidderId = input?.bidderId ? readNonEmptyString(input?.bidderId, "bidderId", errors) : undefined
  const bidderName = input?.bidderName ? readNonEmptyString(input?.bidderName, "bidderName", errors) : undefined
  const amount = readNumber(input?.amount, "amount", errors, {min: 0})
  if (errors.length) return {errors}
  return {value: {
    bidderId: bidderId || "",
    bidderName: bidderName || "",
    amount
  }}
}

export function validateAuctionUpdate(input: any): {value?: {status?: AuctionStatus}, errors?: string[]} {
  const errors: string[] = []
  const out: {status?: AuctionStatus} = {}
  if (hasProp(input, "status")) {
    if (input.status === "open" || input.status === "awaiting_payment" || input.status === "closed" || input.status === "cancelled") out.status = input.status
    else errors.push("status must be open, awaiting_payment, closed or cancelled")
  }
  if (!Object.keys(out).length) errors.push("no valid fields to update")
  if (errors.length) return {errors}
  return {value: out}
}

function parseDate(v: any, errors: string[]) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) {
    errors.push("endsAt must be a valid date string")
    return null
  }
  return d
}
