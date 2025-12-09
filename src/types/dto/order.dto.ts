import {readNonEmptyString,readNumber,readInt,hasProp} from "./validation.helpers"

export type OrderItemDTO = {productId: string, quantity: number}
export type OrderCreateDTO = {
  customerName: string
  items: OrderItemDTO[]
  totalPrice: number
  status: OrderStatus
}

export type OrderUpdateDTO = {
  customerName?: string
  items?: OrderItemDTO[]
  totalPrice?: number
  status?: OrderStatus
}

export type OrderStatus = "pending" | "paid" | "shipped" | "cancelled"

const allowedStatus: OrderStatus[] = ["pending","paid","shipped","cancelled"]

function validateItems(raw: any, errors: string[]): OrderItemDTO[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push("items must be a non-empty array")
    return []
  }
  const items: OrderItemDTO[] = []
  raw.forEach((it, idx) => {
    const productId = readNonEmptyString(it?.productId, `items[${idx}].productId`, errors)
    const quantity = readInt(it?.quantity, `items[${idx}].quantity`, errors, {min: 1})
    items.push({productId, quantity})
  })
  return items
}

function validateStatus(val: any, errors: string[]) {
  if (!val) return "pending"
  if (!allowedStatus.includes(val)) errors.push("status must be one of: pending, paid, shipped, cancelled")
  return val as OrderStatus
}

export function validateOrderCreate(input: any): {value?: OrderCreateDTO, errors?: string[]} {
  const errors: string[] = []
  const customerName = readNonEmptyString(input?.customerName, "customerName", errors)
  const items = validateItems(input?.items, errors)
  const totalPrice = readNumber(input?.totalPrice, "totalPrice", errors, {min: 0})
  const status = validateStatus(input?.status, errors)
  if (errors.length) return {errors}
  return {value: {customerName, items, totalPrice, status}}
}

export function validateOrderUpdate(input: any): {value?: OrderUpdateDTO, errors?: string[]} {
  const errors: string[] = []
  const out: OrderUpdateDTO = {}
  if (hasProp(input, "customerName")) out.customerName = readNonEmptyString(input.customerName, "customerName", errors)
  if (hasProp(input, "items")) out.items = validateItems(input.items, errors)
  if (hasProp(input, "totalPrice")) out.totalPrice = readNumber(input.totalPrice, "totalPrice", errors, {min: 0})
  if (hasProp(input, "status")) out.status = validateStatus(input.status, errors)
  if (!Object.keys(out).length) errors.push("no valid fields to update")
  if (errors.length) return {errors}
  return {value: out}
}

