import "dotenv/config"
import {app} from "./api/server"

const port = Number(process.env.PORT) || 3000

const server = app.listen(port,() => {
  console.log(`API listening on port ${port}`)
});

export default server

