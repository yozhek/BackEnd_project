import express from "express"
import {errorHandler} from "../middleware/error.middleware"
import {validateProductCreate,validateProductUpdate} from "../types/dto/product.dto"
import {createProduct,getProductById,listProducts,updateProduct,deleteProduct} from "../services/product.service"

const app = express()

app.use(express.json())

app.get("/health",(_req,res) => {
  res.status(200).json({status:"ok"})
})

app.get("/products", async (req,res,next) => {
  try {
    const page = Number(req.query.page ?? 1)
    const limit = Number(req.query.limit ?? 10)
    const items = await listProducts(page,limit)
    res.status(200).json({items,page,limit})
  } catch (e) { next(e) }
})

app.get("/products/:id", async (req,res,next) => {
  try {
    const item = await getProductById(req.params.id)
    if (!item) return res.status(404).json({error:"Not Found"})
    res.status(200).json(item)
  } catch (e) { next(e) }
})

app.post("/products", async (req,res,next) => {
  try {
    const {value,errors} = validateProductCreate(req.body)
    if (errors) return res.status(400).json({errors})
    const created = await createProduct(value!)
    res.status(201).json(created)
  } catch (e) {
    next(e)
  }
})

app.put("/products/:id", async (req,res,next) => {
  try {
    const {value,errors} = validateProductUpdate(req.body)
    if (errors) return res.status(400).json({errors})
    const updated = await updateProduct(req.params.id,value!)
    if (!updated) return res.status(404).json({error:"Not Found"})
    res.status(200).json(updated)
  } catch (e) { next(e) }
})

app.delete("/products/:id", async (req,res,next) => {
  try {
    const ok = await deleteProduct(req.params.id)
    if (!ok) return res.status(404).json({error:"Not Found"})
    res.status(204).send()
  } catch (e) { next(e) }
})

//404 propadnuti
app.use((_req,res) => {
  res.status(404).json({error:"Not Found"})
})

//Centralni obsluha chyb
app.use(errorHandler)

export { app }
