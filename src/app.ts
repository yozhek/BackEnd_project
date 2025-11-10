import "dotenv/config"
import {app} from "./api/server"
import {connectToMongo,disconnectMongo} from "./database/mongo"

const port = Number(process.env.PORT) || 3000
const mongoUrl = process.env.MONGO_URL

async function start() {
  if (!mongoUrl) {
    console.error("Missing MONGO_URL in environment")
    process.exit(1)
  }
  try {
    await connectToMongo(mongoUrl)
    const server = app.listen(port, () => {
      console.log(`API listening on port ${port}`)
    })
    setupShutdown(server)
    return server
  } catch (e) {
    console.error("Failed to connect to MongoDB:", (e as Error).message)
    process.exit(1)
  }
}

function setupShutdown(server: import("http").Server) {
  const stop = async () => {
    server.close(() => console.log("HTTP server closed"))
    await disconnectMongo()
    process.exit(0)
  }
  process.on("SIGINT", stop)
  process.on("SIGTERM", stop)
}

const server = await start()
export default server
