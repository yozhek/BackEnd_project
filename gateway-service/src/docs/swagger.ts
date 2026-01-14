import swaggerUi from "swagger-ui-express"
import {RequestHandler} from "express"

const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Gateway Service API",
    version: "1.0.0",
    description: "Broadcast marketplace events to websocket subscribers"
  },
  servers: [{url: "http://localhost:3002"}],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {200: {description: "Service is up"}}
      }
    },
    "/events": {
      post: {
          summary: "Broadcast incoming event",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {$ref: "#/components/schemas/Event"}
              }
            }
          },
          responses: {
            202: {description: "Accepted and broadcast"},
          400: {description: "Invalid payload"}
        }
      }
    },
    "/ws": {
      get: {
        summary: "WebSocket endpoint",
        parameters: [
          {name: "auctionId", in: "query", required: true, schema: {type: "string"}}
        ],
        responses: {
          101: {description: "Switching Protocols"}
        }
      }
    }
  },
  components: {
    schemas: {
      Event: {
        type: "object",
        required: ["type","payload"],
        properties: {
          type: {type: "string"},
          payload: {type: "object"}
        }
      }
    }
  }
}

export function swaggerMiddleware(): RequestHandler[] {
  return [...(swaggerUi.serve as RequestHandler[]), swaggerUi.setup(swaggerSpec)]
}
