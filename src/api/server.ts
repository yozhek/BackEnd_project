import express from "express"
import {errorHandler} from "../middleware/error.middleware"

const app = express()

app.use(express.json())

app.get("/health",(_req,res) => {
  res.status(200).json({status:"ok"})
})

//404 propadnuti
app.use((_req,res) => {
  res.status(404).json({error:"Not Found"})
})

//Centralni obsluha chyb
app.use(errorHandler)

export { app }

