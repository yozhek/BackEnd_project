import swaggerUi from "swagger-ui-express"
import {RequestHandler} from "express"

const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Auth Service API",
    version: "1.0.0",
    description: "User registration via Keycloak admin"
  },
  servers: [{url: "http://localhost:3003"}],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {200: {description: "Service is up"}}
      }
    },
    "/register": {
      post: {
        summary: "Register user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/RegisterRequest"}
            }
          }
        },
        responses: {
          201: {description: "Created"},
          400: {description: "Validation error"},
          409: {description: "User exists"},
          500: {description: "Keycloak error"}
        }
      }
    }
  },
  components: {
    schemas: {
      RegisterRequest: {
        type: "object",
        required: ["username","email","password","role"],
        properties: {
          username: {type: "string"},
          email: {type: "string"},
          password: {type: "string"},
          role: {type: "string", enum: ["buyer","seller"]}
        }
      }
    }
  }
}

export function swaggerMiddleware(): RequestHandler[] {
  return [...(swaggerUi.serve as RequestHandler[]), swaggerUi.setup(swaggerSpec)]
}
