import "dotenv/config"
import {startServer} from "./api/server"

const port = Number(process.env.PORT) || 3002

await startServer(port)
