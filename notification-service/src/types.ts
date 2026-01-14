export type NotifyPayload =
  | {type: "auction_created", auctionId: string, sellerId: string, sellerName?: string, productTitle: string, startPrice: number, endsAt: string}
  | {type: "bid_placed", auctionId: string, bidderId: string, bidderName?: string, amount: number, productTitle: string}
  | {type: "outbid", auctionId: string, bidderId: string, bidderName?: string, amount: number, productTitle: string}
  | {type: "order_completed", auctionId: string, bidderId: string, bidderName?: string, amount: number, productTitle: string}
  | {type: "auction_won", auctionId: string, bidderId: string, bidderName?: string, amount: number, productTitle: string, paymentExpiresAt: string}
  | {type: "auction_closed", auctionId: string, sellerId: string, sellerName?: string, productTitle: string, finalPrice: number, winnerName?: string}

export type NotifyRequest = {type: NotifyPayload["type"], payload: any}
