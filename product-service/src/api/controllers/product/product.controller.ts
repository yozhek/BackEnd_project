import type {Request,Response,NextFunction} from "express"
import {validateProductCreate,validateProductUpdate} from "../../../types/dto/product.dto"
import {validatePagination} from "../../../types/dto/pagination.dto"
import {createProduct,getProductById,listProducts,updateProduct,deleteProduct} from "../../../services/product.service"

export class ProductController {
  async list(req: Request,res: Response,next: NextFunction) {
    try {
      const {value,errors} = validatePagination(req.query)
      if (errors) return res.status(400).json({errors})
      const mine = req.query.mine === "true" && (req as any).user?.sub
      const ownerId = mine ? (req as any).user.sub : undefined
      const items = await listProducts(value!.page,value!.limit, ownerId)
      res.status(200).json({items,page:value!.page,limit:value!.limit})
    } catch (e) { next(e) }
  }

  async getById(req: Request,res: Response,next: NextFunction) {
    try {
      const item = await getProductById(req.params.id)
      if (!item) return res.status(404).json({error:"Not Found"})
      res.status(200).json(item)
    } catch (e) { next(e) }
  }

  async create(req: Request,res: Response,next: NextFunction) {
    try {
      const {value,errors} = validateProductCreate(req.body)
      if (errors) return res.status(400).json({errors})
      const user = (req as any).user
      const created = await createProduct(value!, {id: user?.sub, name: user?.username})
      res.status(201).json(created)
    } catch (e) { next(e) }
  }

  async update(req: Request,res: Response,next: NextFunction) {
    try {
      const {value,errors} = validateProductUpdate(req.body)
      if (errors) return res.status(400).json({errors})
      const updated = await updateProduct(req.params.id,value!, (req as any).user?.sub)
      if (!updated) return res.status(404).json({error:"Not Found"})
      if ((updated as any).forbidden) return res.status(403).json({error:"Forbidden"})
      res.status(200).json(updated)
    } catch (e) { next(e) }
  }

  async remove(req: Request,res: Response,next: NextFunction) {
    try {
      const ok = await deleteProduct(req.params.id, (req as any).user?.sub)
      if (!ok) return res.status(404).json({error:"Not Found"})
      res.status(204).send()
    } catch (e) { next(e) }
  }
}
