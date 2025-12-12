export type Product = {
  id: string
  title: string
  price: number
  discountPercent: number
  discountedPrice: number
  category: string
  description: string
  imageBase64?: string
}

export type OrderItem = {productId: string, quantity: number, productTitle?: string, productPrice?: number}
export type Order = {
  id: string
  items: OrderItem[]
  totalPrice: number
  status: string
}
