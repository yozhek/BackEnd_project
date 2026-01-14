import express from "express"
import {errorHandler} from "../middleware/error.middleware"
import {validateRegister} from "../types/dto/register.dto"
import {registerUser} from "../services/keycloak.service"
import {swaggerMiddleware} from "../docs/swagger"

const app = express()

app.use(express.json({limit:"1mb"}))
app.use((req,res,next) => {
  const origin = req.headers.origin || "http://localhost:5002"
  res.header("Access-Control-Allow-Origin", origin)
  res.header("Vary","Origin")
  res.header("Access-Control-Allow-Methods","GET,POST,OPTIONS")
  res.header("Access-Control-Allow-Headers","Content-Type, Authorization, Accept")
  if (req.method === "OPTIONS") return res.sendStatus(204)
  next()
})

app.use("/docs", ...swaggerMiddleware())

app.get("/health", (_req,res) => {
  res.status(200).json({status:"ok"})
})

app.post("/register", async (req,res,next) => {
  try {
    const {value,errors} = validateRegister(req.body)
    if (errors) return res.status(400).json({errors})
    const created = await registerUser(value!)
    res.status(201).json(created)
  } catch (e:any) {
    if (e.message?.includes("exists")) return res.status(409).json({error: e.message})
    next(e)
  }
})

app.use((_req,res) => res.status(404).json({error:"Not Found"}))
app.use(errorHandler)

export {app}
