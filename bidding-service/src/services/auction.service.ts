import {ObjectId} from "mongodb"
import {getDb} from "../database/mongo"
import type {AuctionCreateDTO,AuctionBidDTO,AuctionStatus} from "../types/dto/auction.dto"

type AuctionDoc = {
  _id?: ObjectId
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
  status: AuctionStatus
  currentAmount: number | null
  currentWinnerId?: string
  currentWinnerName?: string
  winnerId?: string
  winnerName?: string
  winnerBid?: number
  paymentExpiresAt?: Date | null
  leadingBidder?: string
  bids: {amount: number, bidderId: string, bidderName: string, createdAt: Date}[]
  version: number
  round: number
  createdAt: Date
  updatedAt: Date
}

type PlaceBidResult =
  | {ok:true, auction: ReturnType<typeof mapAuction>}
  | {ok:false, reason:"not_found" | "conflict" | "closed" | "expired" | "owner_forbidden" | "low_bid", minAllowed?: number}

export async function createAuction(dto: AuctionCreateDTO) {
  const db = getDb()
  const doc = buildDoc(dto)
  const res = await db.collection<AuctionDoc>("auctions").insertOne(doc)
  const created = mapAuction({_id: res.insertedId, ...doc})
  await notifyGateway("auction-created", {
    auctionId: created.id,
    productId: created.productId,
    sellerId: created.sellerId,
    sellerName: created.sellerName,
    startPrice: created.startPrice,
    minIncrement: created.minIncrement,
    endsAt: created.endsAt
  })
  await notifyNotification("auction_created", {
    auctionId: created.id,
    sellerId: created.sellerId,
    sellerName: created.sellerName,
    productTitle: created.productTitle,
    startPrice: created.startPrice,
    endsAt: created.endsAt.toISOString()
  })
  return created
}

export async function listAuctions(page: number, limit: number, status?: AuctionStatus) {
  const db = getDb()
  const skip = Math.max(0, (page - 1) * limit)
  const filter = status ? {status} : {}
  const cursor = db.collection<AuctionDoc>("auctions")
    .find(filter)
    .sort({createdAt: -1})
    .skip(skip)
    .limit(limit)
  const docs = await cursor.toArray()
  const settled = await Promise.all(docs.map(d => settleIfExpired(d)))
  return settled.filter((d): d is AuctionDoc => !!d).map(mapAuction)
}

export async function getAuctionById(id: string) {
  const db = getDb()
  const _id = toObjectId(id)
  if (!_id) return null
  const doc = await db.collection<AuctionDoc>("auctions").findOne({_id})
  return doc ? mapAuction(doc) : null
}

export async function deleteAuction(id: string) {
  const db = getDb()
  const _id = toObjectId(id)
  if (!_id) return false
  const found = await db.collection<AuctionDoc>("auctions").findOne({_id})
  if (!found) return false
  const res = await db.collection("auctions").deleteOne({_id})
  if (res.deletedCount === 1) {
    await notifyGateway("auction-deleted", {auctionId: id})
    return true
  }
  return false
}

export async function closeAuctionWithWinner(id: string, sellerId?: string) {
  const _id = toObjectId(id)
  if (!_id) return {ok:false, reason:"not_found"} as const
  const doc = await loadAuction(_id)
  const auth = authorizeClose(doc, sellerId)
  if (!auth.doc) return auth.result
  if (!hasBids(auth.doc)) return closeWithoutBids(id, auth.doc)
  const top = pickTopBid(auth.doc)
  const updated = await setAwaitingPayment(auth.doc._id!, top)
  if (!updated) return {ok:false, reason:"not_found"} as const
  await notifyWinnerAndSeller(id, auth.doc, top)
  return {ok:true, auction: mapAuction(updated)} as const
}

export async function expireAwaitingPayment(id: string, force?: boolean) {
  const _id = toObjectId(id)
  if (!_id) return {ok:false, reason:"not_found"} as const
  const db = getDb()
  const doc = await db.collection<AuctionDoc>("auctions").findOne({_id})
  if (!doc) return {ok:false, reason:"not_found"} as const
  if (doc.status !== "awaiting_payment") return {ok:true, auction: mapAuction(doc)} as const
  if (shouldWaitPayment(doc, force)) return {ok:true, auction: mapAuction(doc)} as const
  if (!hasBids(doc)) {
    await deleteAuction(id)
    return {ok:true, deleted:true} as const
  }
  const reopened = await reopenAuction(_id, doc)
  if (!reopened) return {ok:false, reason:"not_found"} as const
  return {ok:true, auction: mapAuction(reopened)} as const
}

export async function updateAuctionStatus(id: string, status: AuctionStatus) {
  const db = getDb()
  const _id = toObjectId(id)
  if (!_id) return null
  const existing = await db.collection<AuctionDoc>("auctions").findOne({_id})
  if (!existing) return null
  const res = await db.collection<AuctionDoc>("auctions").findOneAndUpdate({_id}, {$set: {status, updatedAt: new Date()}}, {returnDocument: "after"})
  const updated = unwrapResult<AuctionDoc>(res)
  if (!updated) return null
  const mapped = mapAuction(updated)
  await notifyGateway("auction-status", {auctionId: mapped.id, status: mapped.status})
  if (status === "closed" && mapped.currentWinnerId && mapped.winnerBid) {
    const type = existing.status === "awaiting_payment" ? "order_completed" : "auction_won"
    await notifyNotification(type, {
      auctionId: mapped.id,
      bidderId: mapped.currentWinnerId,
      bidderName: mapped.currentWinnerName,
      amount: mapped.winnerBid,
      productTitle: mapped.productTitle,
      paymentExpiresAt: new Date(Date.now() + 24*3600_000).toISOString()
    })
    await notifyNotification("auction_closed", {
      auctionId: mapped.id,
      sellerId: mapped.sellerId,
      sellerName: mapped.sellerName,
      productTitle: mapped.productTitle,
      finalPrice: mapped.winnerBid,
      winnerName: mapped.currentWinnerName
    })
  }
  return mapped
}

export async function placeBid(id: string, bid: AuctionBidDTO): Promise<PlaceBidResult> {
  const _id = toObjectId(id)
  if (!_id) return {ok:false, reason:"not_found"} as const
  const doc = await loadAuction(_id)
  const validation = validateBidFlow(doc, bid)
  if (!validation.ok) return validation.result
  const prev = {id: doc!.currentWinnerId, name: doc!.currentWinnerName}
  const updated = await saveBid(_id, doc!, bid)
  if (!updated) return {ok:false, reason:"conflict"} as const
  const auction = mapAuction(updated)
  await notifyBidFlow(auction, bid, prev)
  return {ok:true, auction} as const
}

function buildDoc(dto: AuctionCreateDTO): AuctionDoc {
  return {
    productId: dto.productId,
    productTitle: dto.productTitle,
    sellerId: dto.sellerId,
    sellerName: dto.sellerName,
    description: dto.description,
    category: dto.category,
    imageBase64: dto.imageBase64,
    startPrice: dto.startPrice,
    minIncrement: dto.minIncrement,
    endsAt: dto.endsAt,
    status: "open",
    currentAmount: null,
    currentWinnerId: undefined,
    currentWinnerName: undefined,
    winnerId: undefined,
    winnerName: undefined,
    winnerBid: undefined,
    paymentExpiresAt: null,
    bids: [],
    round: 1,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

async function settleIfExpired(doc: AuctionDoc): Promise<AuctionDoc | null> {
  if (doc.status !== "open") return doc
  if (!doc.endsAt || doc.endsAt.getTime() > Date.now()) return doc
  if (!hasBids(doc)) {
    await deleteAuction(doc._id?.toString() || "")
    return null
  }
  const top = pickTopBid(doc)
  const updated = await setAwaitingPayment(doc._id!, top)
  if (!updated) return null
  await notifyWinnerAndSeller(doc._id?.toString() || "", doc, top)
  return updated
}

function mapAuction(doc: AuctionDoc) {
  return {
    id: doc._id?.toHexString(),
    productId: doc.productId,
    productTitle: doc.productTitle,
    sellerId: doc.sellerId,
    sellerName: doc.sellerName,
    description: doc.description,
    category: doc.category,
    imageBase64: doc.imageBase64,
    startPrice: doc.startPrice,
    minIncrement: doc.minIncrement,
    endsAt: doc.endsAt,
    status: doc.status,
    currentAmount: doc.currentAmount,
    currentWinnerId: doc.currentWinnerId,
    currentWinnerName: doc.currentWinnerName,
    winnerId: doc.winnerId,
    winnerName: doc.winnerName,
    winnerBid: doc.winnerBid,
    paymentExpiresAt: doc.paymentExpiresAt,
    leadingBidder: doc.leadingBidder,
    bids: doc.bids?.map(b => ({
      amount: b.amount,
      bidderId: b.bidderId,
      bidderName: b.bidderName,
      createdAt: b.createdAt
    })),
    round: doc.round,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  }
}

function computeMinAllowed(doc: AuctionDoc) {
  const base = doc.currentAmount ?? doc.startPrice
  return Number((base + doc.minIncrement).toFixed(2))
}

function toObjectId(id: string) {
  try { return new ObjectId(id) } catch { return null }
}

async function loadAuction(_id: ObjectId) {
  const db = getDb()
  return db.collection<AuctionDoc>("auctions").findOne({_id})
}

function validateBidState(doc: AuctionDoc) {
  if (doc.status !== "open") return {ok:false, reason:"closed"} as const
  if (doc.endsAt.getTime() <= Date.now()) return {ok:false, reason:"expired"} as const
  return null
}

async function saveBid(_id: ObjectId, doc: AuctionDoc, bid: AuctionBidDTO) {
  const db = getDb()
  const res = await db.collection<AuctionDoc>("auctions").updateOne(
    {_id},
    {
      $set: {
        currentAmount: bid.amount,
        currentWinnerId: bid.bidderId,
        currentWinnerName: bid.bidderName,
        leadingBidder: bid.bidderName,
        updatedAt: new Date()
      },
      $inc: {version: 1},
      $push: {
        bids: {
          amount: bid.amount,
          bidderId: bid.bidderId,
          bidderName: bid.bidderName,
          createdAt: new Date()
        }
      }
    }
  )
  if (res.modifiedCount !== 1) return null
  return loadAuction(_id)
}

async function notifyGateway(type: string, payload: any) {
  const url = process.env.GATEWAY_URL
  if (!url) return
  try {
    await fetch(url, {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({type, payload})
    })
  } catch {
    // best-effort, do not block bidding flow
  }
}

async function notifyNotification(type: string, payload: any) {
  const url = process.env.NOTIFY_URL
  if (!url) return
  try {
    await fetch(url, {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({type, payload})
    })
  } catch {
    // ignore notification failures
  }
}

function unwrapResult<T>(res: any): T | null {
  if (!res) return null
  if (Object.prototype.hasOwnProperty.call(res, "value")) return res.value as T | null
  return res as T | null
}

function authorizeClose(doc: AuctionDoc | null, sellerId?: string) {
  if (!doc) return {doc: null, result: {ok:false, reason:"not_found"} as const}
  if (sellerId && doc.sellerId && doc.sellerId !== sellerId) {
    return {doc: null, result: {ok:false, reason:"forbidden"} as const}
  }
  return {doc}
}

function hasBids(doc: AuctionDoc) {
  return !!doc.bids && doc.bids.length > 0
}

async function closeWithoutBids(id: string, doc: AuctionDoc) {
  await deleteAuction(id)
  await notifyNotification("auction_closed", {
    auctionId: id,
    sellerId: doc.sellerId,
    sellerName: doc.sellerName,
    productTitle: doc.productTitle,
    finalPrice: 0,
    winnerName: "no bids"
  })
  return {ok:true, deleted:true} as const
}

function pickTopBid(doc: AuctionDoc) {
  return [...doc.bids].sort((a,b) => {
    if (b.amount !== a.amount) return b.amount - a.amount
    return b.createdAt.getTime() - a.createdAt.getTime()
  })[0]
}

async function setAwaitingPayment(_id: ObjectId, top: {amount:number, bidderId:string, bidderName:string}) {
  const db = getDb()
  const res = await db.collection<AuctionDoc>("auctions").findOneAndUpdate(
    {_id},
    {
      $set: {
        status: "awaiting_payment",
        winnerId: top.bidderId,
        winnerName: top.bidderName,
        winnerBid: top.amount,
        currentWinnerId: top.bidderId,
        currentWinnerName: top.bidderName,
        paymentExpiresAt: new Date(Date.now() + 24*3600_000),
        updatedAt: new Date()
      }
    },
    {returnDocument: "after"}
  )
  return unwrapResult<AuctionDoc>(res)
}

async function notifyWinnerAndSeller(id: string, doc: AuctionDoc, top: {amount:number, bidderId:string, bidderName:string}) {
  await notifyNotification("auction_won", {
    auctionId: id,
    bidderId: top.bidderId,
    bidderName: top.bidderName,
    amount: top.amount,
    productTitle: doc.productTitle,
    paymentExpiresAt: new Date(Date.now() + 24*3600_000).toISOString()
  })
  await notifyNotification("auction_closed", {
    auctionId: id,
    sellerId: doc.sellerId,
    sellerName: doc.sellerName,
    productTitle: doc.productTitle,
    finalPrice: top.amount,
    winnerName: top.bidderName
  })
}

function shouldWaitPayment(doc: AuctionDoc, force?: boolean) {
  const now = Date.now()
  return !force && (!doc.paymentExpiresAt || doc.paymentExpiresAt.getTime() > now)
}

async function reopenAuction(_id: ObjectId, doc: AuctionDoc) {
  const db = getDb()
  const res = await db.collection<AuctionDoc>("auctions").findOneAndUpdate(
    {_id},
    {
      $set: {
        status: "open",
        endsAt: computeNewEnds(doc.endsAt),
        paymentExpiresAt: null,
        winnerId: undefined,
        winnerName: undefined,
        winnerBid: undefined,
        currentAmount: null,
        currentWinnerId: undefined,
        currentWinnerName: undefined,
        leadingBidder: undefined,
        bids: [],
        round: (doc.round || 1) + 1,
        updatedAt: new Date()
      }
    },
    {returnDocument: "after"}
  )
  return unwrapResult<AuctionDoc>(res)
}

function computeNewEnds(current?: Date) {
  const now = Date.now()
  const minEnd = now + 24*3600_000
  const currentEnd = current?.getTime() ?? 0
  return new Date(currentEnd <= minEnd ? minEnd : currentEnd)
}

type BidValidationResult =
  | {ok:true}
  | {ok:false, result:
      | {ok:false, reason:"not_found"}
      | {ok:false, reason:"closed"}
      | {ok:false, reason:"expired"}
      | {ok:false, reason:"owner_forbidden"}
      | {ok:false, reason:"low_bid", minAllowed: number}
    }

function validateBidFlow(doc: AuctionDoc | null, bid: AuctionBidDTO): BidValidationResult {
  if (!doc) return {ok:false, result: {ok:false, reason:"not_found"} as const}
  const state = validateBidState(doc)
  if (state) return {ok:false, result: state}
  if (bid.bidderId === doc.sellerId) return {ok:false, result: {ok:false, reason:"owner_forbidden"} as const}
  const minAllowed = computeMinAllowed(doc)
  if (bid.amount < minAllowed) return {ok:false, result: {ok:false, reason:"low_bid", minAllowed} as const}
  return {ok:true}
}

async function notifyBidFlow(auction: ReturnType<typeof mapAuction>, bid: AuctionBidDTO, prev: {id?: string | null, name?: string | null}) {
  await notifyGateway("bid", {
    auctionId: auction.id,
    amount: bid.amount,
    bidderId: bid.bidderId,
    bidderName: bid.bidderName
  })
  await notifyNotification("bid_placed", {
    auctionId: auction.id,
    bidderId: bid.bidderId,
    bidderName: bid.bidderName,
    amount: bid.amount,
    productTitle: auction.productTitle
  })
  if (prev.id && prev.id !== bid.bidderId) {
    await notifyNotification("outbid", {
      auctionId: auction.id,
      bidderId: prev.id,
      bidderName: prev.name,
      amount: bid.amount,
      productTitle: auction.productTitle
    })
  }
}
