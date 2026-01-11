import {readNonEmptyString,readNumber,hasProp} from "./validation.helpers"

export type AuctionCreateDTO = {
  productId: string
  productTitle: string
  startPrice: number
  minIncrement: number
  endsAt: Date
}

export type AuctionBidDTO = {
  bidder: string
  amount: number
}

export type AuctionStatus = "open" | "closed" | "cancelled"

export function validateAuctionCreate(input: any): {value?: AuctionCreateDTO, errors?: string[]} {
  const errors: string[] = []
  const productId = readNonEmptyString(input?.productId, "productId", errors)
  const productTitle = readNonEmptyString(input?.productTitle, "productTitle", errors)
  const startPrice = readNumber(input?.startPrice, "startPrice", errors, {min: 0})
  const minIncrement = readNumber(input?.minIncrement, "minIncrement", errors, {min: 0})
  const endsAt = parseDate(input?.endsAt, errors)
  if (endsAt && endsAt.getTime() <= Date.now()) errors.push("endsAt must be in the future")
  if (errors.length) return {errors}
  return {value: {productId, productTitle, startPrice, minIncrement, endsAt: endsAt!}}
}

export function validateAuctionBid(input: any): {value?: AuctionBidDTO, errors?: string[]} {
  const errors: string[] = []
  const bidder = readNonEmptyString(input?.bidder, "bidder", errors)
  const amount = readNumber(input?.amount, "amount", errors, {min: 0})
  if (errors.length) return {errors}
  return {value: {bidder, amount}}
}

export function validateAuctionUpdate(input: any): {value?: {status?: AuctionStatus}, errors?: string[]} {
  const errors: string[] = []
  const out: {status?: AuctionStatus} = {}
  if (hasProp(input, "status")) {
    if (input.status === "open" || input.status === "closed" || input.status === "cancelled") out.status = input.status
    else errors.push("status must be open, closed or cancelled")
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
