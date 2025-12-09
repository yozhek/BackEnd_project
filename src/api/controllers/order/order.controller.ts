import type {Request,Response,NextFunction} from "express"
import {validatePagination} from "../../../types/dto/pagination.dto"
import {validateOrderCreate,validateOrderUpdate} from "../../../types/dto/order.dto"
import {createOrder,getOrderById,listOrders,updateOrder,deleteOrder} from "../../../services/order.service"

export class OrderController {
  async list(req: Request,res: Response,next: NextFunction) {
    try {
      const {value,errors} = validatePagination(req.query)
      if (errors) return res.status(400).json({errors})
      const items = await listOrders(value!.page,value!.limit)
      res.status(200).json({items,page:value!.page,limit:value!.limit})
    } catch (e) { next(e) }
  }

  async getById(req: Request,res: Response,next: NextFunction) {
    try {
      const item = await getOrderById(req.params.id)
      if (!item) return res.status(404).json({error:"Not Found"})
      res.status(200).json(item)
    } catch (e) { next(e) }
  }

  async create(req: Request,res: Response,next: NextFunction) {
    try {
      const {value,errors} = validateOrderCreate(req.body)
      if (errors) return res.status(400).json({errors})
      const created = await createOrder(value!)
      res.status(201).json(created)
    } catch (e) { next(e) }
  }

  async update(req: Request,res: Response,next: NextFunction) {
    try {
      const {value,errors} = validateOrderUpdate(req.body)
      if (errors) return res.status(400).json({errors})
      const updated = await updateOrder(req.params.id,value!)
      if (!updated) return res.status(404).json({error:"Not Found"})
      res.status(200).json(updated)
    } catch (e) { next(e) }
  }

  async remove(req: Request,res: Response,next: NextFunction) {
    try {
      const ok = await deleteOrder(req.params.id)
      if (!ok) return res.status(404).json({error:"Not Found"})
      res.status(204).send()
    } catch (e) { next(e) }
  }
}

