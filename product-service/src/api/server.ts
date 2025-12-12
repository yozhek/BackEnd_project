import express from "express"
import {errorHandler} from "../middleware/error.middleware"
import {ProductController} from "./controllers/product/product.controller"
import {OrderController} from "./controllers/order/order.controller"
import {swaggerMiddleware} from "../docs/swagger"

const app = express()

app.use(express.json({limit:"5mb"}))

// CORS for frontend
app.use((req,res,next) => {
  const origin = req.headers.origin || "http://localhost:5002"
  res.header("Access-Control-Allow-Origin", origin)
  res.header("Vary","Origin")
  res.header("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS")
  res.header("Access-Control-Allow-Headers","Content-Type, Authorization, Accept")
  if (req.method === "OPTIONS") return res.sendStatus(204)
  next()
})

app.get("/health",(_req,res) => {
  res.status(200).json({status:"ok"})
})

app.use("/docs", ...swaggerMiddleware())

const productController = new ProductController()
const orderController = new OrderController()

app.get("/products", productController.list.bind(productController))
app.get("/products/:id", productController.getById.bind(productController))
app.post("/products", productController.create.bind(productController))
app.put("/products/:id", productController.update.bind(productController))
app.delete("/products/:id", productController.remove.bind(productController))

app.get("/orders", orderController.list.bind(orderController))
app.get("/orders/:id", orderController.getById.bind(orderController))
app.post("/orders", orderController.create.bind(orderController))
app.put("/orders/:id", orderController.update.bind(orderController))
app.delete("/orders/:id", orderController.remove.bind(orderController))

//404 propadnuti
app.use((_req,res) => {
  res.status(404).json({error:"Not Found"})
})

//Centralni obsluha chyb
app.use(errorHandler)

export { app }
