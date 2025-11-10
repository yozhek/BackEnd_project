import express from "express"
import {errorHandler} from "../middleware/error.middleware"
import {validateProductCreate} from "../types/dto/product.dto"
import {createProduct} from "../services/product.service"

const app = express()

app.use(express.json())

app.get("/health",(_req,res) => {
  res.status(200).json({status:"ok"})
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

//404 propadnuti
app.use((_req,res) => {
  res.status(404).json({error:"Not Found"})
})

//Centralni obsluha chyb
app.use(errorHandler)

export { app }

