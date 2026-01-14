import swaggerUi from "swagger-ui-express"
import {RequestHandler} from "express"

const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Notification Service API",
    version: "1.0.0",
    description: "Telegram notification endpoints and webhook binding"
  },
  servers: [{url: "http://localhost:4005"}],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {200: {description: "Service is up"}}
      }
    },
    "/notify": {
      post: {
        summary: "Process notification payload",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/NotifyRequest"}
            }
          }
        },
        responses: {
          202: {description: "Queued"},
          400: {description: "Invalid payload"}
        }
      }
    },
    "/auth/telegram/jwt": {
      post: {
        summary: "Create pending Telegram link token",
        requestBody: {
          required: true,
          content: {"application/json": {schema: {$ref: "#/components/schemas/TelegramJwtRequest"}}}
        },
        responses: {
          200: {description: "Token created"},
          400: {description: "Validation error"}
        }
      }
    },
    "/auth/telegram/binding": {
      get: {
        summary: "Get Telegram binding by userId",
        parameters: [{name: "userId", in: "query", required: true, schema: {type: "string"}}],
        responses: {
          200: {description: "Binding found", content: {"application/json": {schema: {$ref: "#/components/schemas/Binding"}}}},
          400: {description: "Validation error"},
          404: {description: "Not found"}
        }
      },
      delete: {
        summary: "Unlink Telegram binding",
        requestBody: {
          required: true,
          content: {"application/json": {schema: {$ref: "#/components/schemas/BindingDeleteRequest"}}}
        },
        responses: {
          200: {description: "Removed", content: {"application/json": {schema: {$ref: "#/components/schemas/Binding"}}}},
          204: {description: "Nothing to remove or no body"},
          400: {description: "Validation error"}
        }
      }
    },
    "/auth/telegram/bot-callback": {
      post: {
        summary: "Callback used by Telegram bot to complete link",
        requestBody: {
          required: true,
          content: {"application/json": {schema: {$ref: "#/components/schemas/BotCallbackRequest"}}}
        },
        responses: {
          200: {description: "Linked", content: {"application/json": {schema: {$ref: "#/components/schemas/Binding"}}}},
          400: {description: "Invalid token/payload"},
          409: {description: "Chat already linked"}
        }
      }
    },
    "/auth/telegram/bot-unlink": {
      post: {
        summary: "Unlink Telegram binding by chatId (bot command)",
        requestBody: {
          required: true,
          content: {"application/json": {schema: {$ref: "#/components/schemas/BotUnlinkRequest"}}}
        },
        responses: {
          200: {description: "Unlinked", content: {"application/json": {schema: {$ref: "#/components/schemas/BotUnlinkResponse"}}}},
          204: {description: "No binding for chatId"},
          400: {description: "Validation error"}
        }
      }
    }
  },
  components: {
    schemas: {
      NotifyRequest: {
        type: "object",
        required: ["type","payload"],
        properties: {
          type: {type: "string"},
          payload: {type: "object"}
        }
      },
      TelegramJwtRequest: {
        type: "object",
        required: ["userId"],
        properties: {userId: {type: "string"}}
      },
      Binding: {
        type: "object",
        properties: {
          userId: {type: "string"},
          chatId: {type: "string"},
          username: {type: "string"}
        }
      },
      BindingDeleteRequest: {
        type: "object",
        required: ["userId"],
        properties: {userId: {type: "string"}}
      },
      BotCallbackRequest: {
        type: "object",
        required: ["token","chatId"],
        properties: {
          token: {type: "string"},
          chatId: {type: "string"},
          username: {type: "string"}
        }
      },
      BotUnlinkRequest: {
        type: "object",
        required: ["chatId"],
        properties: {chatId: {type: "string"}}
      },
      BotUnlinkResponse: {
        type: "object",
        properties: {
          status: {type: "string"},
          userId: {type: "string"}
        }
      }
    }
  }
}

export function swaggerMiddleware(): RequestHandler[] {
  return [...(swaggerUi.serve as RequestHandler[]), swaggerUi.setup(swaggerSpec)]
}
