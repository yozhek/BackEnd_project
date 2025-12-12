import type {Request,Response,NextFunction} from "express"
import {validateProductCreate,validateProductUpdate} from "../../../types/dto/product.dto"
import {validatePagination} from "../../../types/dto/pagination.dto"
import {createProduct,getProductById,listProducts,updateProduct,deleteProduct} from "../../../services/product.service"

export class ProductController {
  async list(req: Request,res: Response,next: NextFunction) {
    try {
      const {value,errors} = validatePagination(req.query)
      if (errors) return res.status(400).json({errors})
      const items = await listProducts(value!.page,value!.limit)
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
      const created = await createProduct(value!)
      res.status(201).json(created)
    } catch (e) { next(e) }
  }

  async update(req: Request,res: Response,next: NextFunction) {
    try {
      const {value,errors} = validateProductUpdate(req.body)
      if (errors) return res.status(400).json({errors})
      const updated = await updateProduct(req.params.id,value!)
      if (!updated) return res.status(404).json({error:"Not Found"})
      res.status(200).json(updated)
    } catch (e) { next(e) }
  }

  async remove(req: Request,res: Response,next: NextFunction) {
    try {
      const ok = await deleteProduct(req.params.id)
      if (!ok) return res.status(404).json({error:"Not Found"})
      res.status(204).send()
    } catch (e) { next(e) }
  }
}

