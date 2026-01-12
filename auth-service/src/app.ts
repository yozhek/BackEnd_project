import "dotenv/config"
import {app} from "./api/server"

const port = Number(process.env.PORT) || 3003
const server = app.listen(port, () => {
  console.log(`Auth service listening on ${port}`)
})

function shutdown() {
  server.close(() => process.exit(0))
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
