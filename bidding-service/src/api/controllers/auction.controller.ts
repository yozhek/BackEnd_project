import type {Request,Response,NextFunction} from "express"
import {validatePagination} from "../../types/dto/pagination.dto"
import {validateAuctionBid,validateAuctionCreate,validateAuctionUpdate} from "../../types/dto/auction.dto"
import {
  createAuction,
  listAuctions,
  getAuctionById,
  placeBid,
  updateAuctionStatus,
  deleteAuction,
  closeAuctionWithWinner,
  expireAwaitingPayment
} from "../../services/auction.service"

export class AuctionController {
  async list(req: Request,res: Response,next: NextFunction) {
    try {
      const {value,errors} = validatePagination(req.query)
      if (errors) return res.status(400).json({errors})
      const status = typeof req.query.status === "string" ? req.query.status : undefined
      const items = await listAuctions(value!.page,value!.limit,status as any)
      res.status(200).json({items,page:value!.page,limit:value!.limit})
    } catch (e) { next(e) }
  }

  async getById(req: Request,res: Response,next: NextFunction) {
    try {
      const item = await getAuctionById(req.params.id)
      if (!item) return res.status(404).json({error:"Not Found"})
      res.status(200).json(item)
    } catch (e) { next(e) }
  }

  async create(req: Request,res: Response,next: NextFunction) {
    try {
      const {value,errors} = validateAuctionCreate(req.body)
      if (errors) return res.status(400).json({errors})
      const user = readUser(req)
      if (!user?.sub && !value!.sellerId) return res.status(401).json({error:"Unauthorized"})
      const dto = {
        ...value!,
        sellerId: value!.sellerId || user!.sub!,
        sellerName: value!.sellerName || user!.username || "seller"
      }
      const created = await createAuction(dto)
      res.status(201).json(created)
    } catch (e) { next(e) }
  }

  async bid(req: Request,res: Response,next: NextFunction) {
    try {
      const {value,errors} = validateAuctionBid(req.body)
      if (errors) return res.status(400).json({errors})
      const user = readUser(req)
      if (!user?.sub && !value!.bidderId) return res.status(401).json({error:"Unauthorized"})
      const dto = {
        ...value!,
        bidderId: value!.bidderId || user!.sub!,
        bidderName: value!.bidderName || user!.username || user!.email || "bidder"
      }
      const result: PlaceBidResult = await placeBid(req.params.id,dto)
      if (!result.ok) return handleBidError(res,result)
      res.status(200).json(result.auction)
    } catch (e) { next(e) }
  }

  async updateStatus(req: Request,res: Response,next: NextFunction) {
    try {
      const status = deriveStatus(req)
      const {value,errors} = validateAuctionUpdate({...req.body, ...(status ? {status} : {})})
      if (errors) return res.status(400).json({errors})
      const auction = await getAuctionById(req.params.id)
      if (!auction) return res.status(404).json({error:"Not Found"})
      const user = readUser(req)
      if (isForbiddenUpdate(auction, user, value!.status)) return res.status(403).json({error:"Forbidden"})
      if (value!.status === "awaiting_payment") return await respondClose(req.params.id, user?.sub, res)
      const updated = await updateAuctionStatus(req.params.id, value!.status!)
      if (!updated) return res.status(404).json({error:"Not Found"})
      res.status(200).json(updated)
    } catch (e) { next(e) }
  }

  async expire(req: Request,res: Response,next: NextFunction) {
    try {
      const force = String(req.query.force || "").toLowerCase() === "true"
      const result = await expireAwaitingPayment(req.params.id, force)
      if (!result.ok) return res.status(404).json({error:"Not Found"})
      if ((result as any).deleted) return res.status(204).send()
      res.status(200).json((result as any).auction)
    } catch (e) { next(e) }
  }

  async remove(req: Request,res: Response,next: NextFunction) {
    try {
      const auction = await getAuctionById(req.params.id)
      if (!auction) return res.status(404).json({error:"Not Found"})
      const user = readUser(req)
      if (auction.sellerId && user?.sub && auction.sellerId !== user.sub) {
        return res.status(403).json({error:"Forbidden"})
      }
      const ok = await deleteAuction(req.params.id)
      if (!ok) return res.status(404).json({error:"Not Found"})
      res.status(204).send()
    } catch (e) { next(e) }
  }
}

function readUser(req: Request) {
  return (req as any).user as {sub?: string, username?: string, email?: string, roles?: string[]} | undefined
}

function deriveStatus(req: Request) {
  return req.path.endsWith("/close") ? "awaiting_payment" : undefined
}

function isForbiddenUpdate(auction: any, user: any, status?: string) {
  const isWinnerClose = status === "closed" && auction.status === "awaiting_payment" && auction.winnerId && user?.sub === auction.winnerId
  return !isWinnerClose && auction.sellerId && user?.sub && auction.sellerId !== user.sub
}

async function respondClose(id: string, userId: string | undefined, res: Response) {
  const result = await closeAuctionWithWinner(id, userId)
  if (!result.ok) return res.status(result.reason === "not_found" ? 404 : 403).json({error: "Cannot close auction"})
  if ((result as any).deleted) return res.status(204).send()
  return res.status(200).json((result as any).auction)
}

function handleBidError(res: Response, result: Extract<PlaceBidResult, {ok:false}>) {
  if (result.reason === "not_found") return res.status(404).json({error:"Not Found"})
  if (result.reason === "closed" || result.reason === "expired") return res.status(409).json({error:"Auction closed"})
  if (result.reason === "owner_forbidden") return res.status(403).json({error:"Owner cannot bid"})
  if (result.reason === "low_bid") return res.status(400).json({error:`Bid must be >= ${result.minAllowed}`})
  return res.status(409).json({error:"Concurrent update, retry"})
}

type PlaceBidResult = Awaited<ReturnType<typeof placeBid>>
