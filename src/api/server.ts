import express from "express"
import {errorHandler} from "../middleware/error.middleware"
import {ProductController} from "./controllers/product/product.controller"

const app = express()

app.use(express.json())

app.get("/health",(_req,res) => {
  res.status(200).json({status:"ok"})
})

const productController = new ProductController()

app.get("/products", productController.list.bind(productController))
app.get("/products/:id", productController.getById.bind(productController))
app.post("/products", productController.create.bind(productController))
app.put("/products/:id", productController.update.bind(productController))
app.delete("/products/:id", productController.remove.bind(productController))

//404 propadnuti
app.use((_req,res) => {
  res.status(404).json({error:"Not Found"})
})

//Centralni obsluha chyb
app.use(errorHandler)

export { app }
