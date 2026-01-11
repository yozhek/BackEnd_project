import express from "express"
import {errorHandler} from "../middleware/error.middleware"
import {AuctionController} from "./controllers/auction.controller"
import {swaggerMiddleware} from "../docs/swagger"

const app = express()

app.use(express.json({limit:"5mb"}))

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

const auctionController = new AuctionController()

app.get("/auctions", auctionController.list.bind(auctionController))
app.get("/auctions/:id", auctionController.getById.bind(auctionController))
app.post("/auctions", auctionController.create.bind(auctionController))
app.post("/auctions/:id/bids", auctionController.bid.bind(auctionController))
app.put("/auctions/:id/status", auctionController.updateStatus.bind(auctionController))
app.delete("/auctions/:id", auctionController.remove.bind(auctionController))

app.use((_req,res) => {
  res.status(404).json({error:"Not Found"})
})

app.use(errorHandler)

export {app}
