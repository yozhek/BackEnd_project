import {ObjectId} from "mongodb"
import {getDb} from "../database/mongo"
import type {AuctionCreateDTO,AuctionBidDTO,AuctionStatus} from "../types/dto/auction.dto"

type AuctionDoc = {
  _id?: ObjectId
  productId: string
  productTitle: string
  startPrice: number
  minIncrement: number
  endsAt: Date
  status: AuctionStatus
  currentAmount: number | null
  leadingBidder?: string
  bids: {amount: number, bidder: string, createdAt: Date}[]
  version: number
  createdAt: Date
  updatedAt: Date
}

export async function createAuction(dto: AuctionCreateDTO) {
  const db = getDb()
  const doc = buildDoc(dto)
  const res = await db.collection<AuctionDoc>("auctions").insertOne(doc)
  return mapAuction({_id: res.insertedId, ...doc})
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
  return docs.map(mapAuction)
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
  const res = await db.collection("auctions").deleteOne({_id})
  return res.deletedCount === 1
}

export async function updateAuctionStatus(id: string, status: AuctionStatus) {
  const db = getDb()
  const _id = toObjectId(id)
  if (!_id) return null
  const res = await db.collection<AuctionDoc>("auctions").findOneAndUpdate(
    {_id},
    {$set: {status, updatedAt: new Date()}},
    {returnDocument: "after"}
  )
  const updated = (res as any)?.value as AuctionDoc | null
  if (!updated) return null
  return mapAuction(updated)
}

export async function placeBid(id: string, bid: AuctionBidDTO) {
  const _id = toObjectId(id)
  if (!_id) return {ok:false, reason:"not_found"} as const
  const doc = await loadAuction(_id)
  if (!doc) return {ok:false, reason:"not_found"} as const
  const state = validateBidState(doc)
  if (state) return state
  const minAllowed = computeMinAllowed(doc)
  if (bid.amount < minAllowed) return {ok:false, reason:"low_bid", minAllowed} as const
  const updated = await saveBid(_id, doc, bid)
  if (!updated) return {ok:false, reason:"conflict"} as const
  return {ok:true, auction: mapAuction(updated)} as const
}

function buildDoc(dto: AuctionCreateDTO): AuctionDoc {
  return {
    productId: dto.productId,
    productTitle: dto.productTitle,
    startPrice: dto.startPrice,
    minIncrement: dto.minIncrement,
    endsAt: dto.endsAt,
    status: "open",
    currentAmount: null,
    bids: [],
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

function mapAuction(doc: AuctionDoc) {
  return {
    id: doc._id?.toString(),
    productId: doc.productId,
    productTitle: doc.productTitle,
    startPrice: doc.startPrice,
    minIncrement: doc.minIncrement,
    endsAt: doc.endsAt,
    status: doc.status,
    currentAmount: doc.currentAmount,
    leadingBidder: doc.leadingBidder,
    bids: doc.bids?.map(b => ({amount: b.amount, bidder: b.bidder, createdAt: b.createdAt})),
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
        leadingBidder: bid.bidder,
        updatedAt: new Date()
      },
      $inc: {version: 1},
      $push: {bids: {amount: bid.amount, bidder: bid.bidder, createdAt: new Date()}}
    }
  )
  if (res.modifiedCount !== 1) return null
  return loadAuction(_id)
}
