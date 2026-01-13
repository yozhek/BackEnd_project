export type Product = {
  id: string
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
}

export type OrderItem = {productId: string, quantity: number, productTitle?: string, productPrice?: number}
export type Order = {
  id: string
  items: OrderItem[]
  totalPrice: number
  status: string
  buyerId?: string
  buyerName?: string
  buyerEmail?: string
}

export type Bid = {
  bidderId: string
  bidderName: string
  amount: number
  createdAt: string
}

export type Auction = {
  id: string
  productId: string
  productTitle: string
  sellerId: string
  sellerName: string
  description?: string
  category?: string
  imageBase64?: string
  startPrice: number
  minIncrement: number
  endsAt: string
  status: "open" | "awaiting_payment" | "closed" | "cancelled"
  currentAmount: number | null
  currentWinnerId?: string
  currentWinnerName?: string
  winnerId?: string
  winnerName?: string
  winnerBid?: number
  paymentExpiresAt?: string
  bids: Bid[]
}
