import type {Request,Response,NextFunction} from "express"
import {validatePagination} from "../../../types/dto/pagination.dto"
import {validateOrderCreate,validateOrderUpdate} from "../../../types/dto/order.dto"
import {createOrder,getOrderById,listOrders,updateOrder,deleteOrder} from "../../../services/order.service"

export class OrderController {
  async list(req: Request,res: Response,next: NextFunction) {
    try {
      const {value,errors} = validatePagination(req.query)
      if (errors) return res.status(400).json({errors})
      const buyerId = (req as any).user?.sub
      const items = await listOrders(value!.page,value!.limit,buyerId)
      res.status(200).json({items,page:value!.page,limit:value!.limit})
    } catch (e) { next(e) }
  }

  async getById(req: Request,res: Response,next: NextFunction) {
    try {
      const item = await getOrderById(req.params.id, (req as any).user?.sub)
      if (!item) return res.status(404).json({error:"Not Found"})
      res.status(200).json(item)
    } catch (e) { next(e) }
  }

  async create(req: Request,res: Response,next: NextFunction) {
    try {
      const {value,errors} = validateOrderCreate(req.body)
      if (errors) return res.status(400).json({errors})
      const user = (req as any).user
      const created = await createOrder(value!, {id: user?.sub, name: user?.username, email: user?.email})
      res.status(201).json(created)
    } catch (e) {
      if ((e as any)?.status === 400) return res.status(400).json({error:(e as any).message})
      next(e)
    }
  }

  async update(req: Request,res: Response,next: NextFunction) {
    try {
      const {value,errors} = validateOrderUpdate(req.body)
      if (errors) return res.status(400).json({errors})
      const updated = await updateOrder(req.params.id,value!, (req as any).user?.sub)
      if (!updated) return res.status(404).json({error:"Not Found"})
      if ((updated as any).forbidden) return res.status(403).json({error:"Forbidden"})
      res.status(200).json(updated)
    } catch (e) {
      if ((e as any)?.status === 400) return res.status(400).json({error:(e as any).message})
      next(e)
    }
  }

  async remove(req: Request,res: Response,next: NextFunction) {
    try {
      const ok = await deleteOrder(req.params.id, (req as any).user?.sub)
      if (!ok) return res.status(404).json({error:"Not Found"})
      res.status(204).send()
    } catch (e) { next(e) }
  }
}
