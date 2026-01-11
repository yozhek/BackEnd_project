import type {Request,Response,NextFunction} from "express"
import {validatePagination} from "../../types/dto/pagination.dto"
import {validateAuctionBid,validateAuctionCreate,validateAuctionUpdate} from "../../types/dto/auction.dto"
import {createAuction,listAuctions,getAuctionById,placeBid,updateAuctionStatus,deleteAuction} from "../../services/auction.service"

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
      const created = await createAuction(value!)
      res.status(201).json(created)
    } catch (e) { next(e) }
  }

  async bid(req: Request,res: Response,next: NextFunction) {
    try {
      const {value,errors} = validateAuctionBid(req.body)
      if (errors) return res.status(400).json({errors})
      const result = await placeBid(req.params.id,value!)
      if (!result.ok) return handleBidError(res,result)
      res.status(200).json(result.auction)
    } catch (e) { next(e) }
  }

  async updateStatus(req: Request,res: Response,next: NextFunction) {
    try {
      const {value,errors} = validateAuctionUpdate(req.body)
      if (errors) return res.status(400).json({errors})
      const updated = await updateAuctionStatus(req.params.id,value!.status!)
      if (!updated) return res.status(404).json({error:"Not Found"})
      res.status(200).json(updated)
    } catch (e) { next(e) }
  }

  async remove(req: Request,res: Response,next: NextFunction) {
    try {
      const ok = await deleteAuction(req.params.id)
      if (!ok) return res.status(404).json({error:"Not Found"})
      res.status(204).send()
    } catch (e) { next(e) }
  }
}

function handleBidError(res: Response, result: any) {
  if (result.reason === "not_found") return res.status(404).json({error:"Not Found"})
  if (result.reason === "closed" || result.reason === "expired") return res.status(409).json({error:"Auction closed"})
  if (result.reason === "low_bid") return res.status(400).json({error:`Bid must be >= ${result.minAllowed}`})
  return res.status(409).json({error:"Concurrent update, retry"})
}
