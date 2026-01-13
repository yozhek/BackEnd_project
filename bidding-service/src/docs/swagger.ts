import swaggerUi from "swagger-ui-express"
import {RequestHandler} from "express"

export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Bidding Service API",
    version: "1.0.0",
    description: "Auctions and bids endpoints"
  },
  servers: [{url: "http://localhost:3001"}],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {200: {description: "Service is up"}}
      }
    },
    "/auctions": {
      get: {
        summary: "List auctions",
        parameters: [
          {name: "page", in: "query", schema: {type: "integer", minimum: 1}},
          {name: "limit", in: "query", schema: {type: "integer", minimum: 1, maximum: 100}},
          {name: "status", in: "query", schema: {type: "string", enum: ["open","closed","cancelled"]}}
        ],
        responses: {
          200: {
            description: "Auctions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: {type: "array", items: {$ref: "#/components/schemas/Auction"}},
                    page: {type: "integer"},
                    limit: {type: "integer"}
                  }
                }
              }
            }
          },
          400: {description: "Bad pagination"}
        }
      },
      post: {
        summary: "Create auction",
        requestBody: {
          required: true,
          content: {"application/json": {schema: {$ref: "#/components/schemas/AuctionCreate"}}}
        },
        responses: {
          201: {description: "Created", content: {"application/json": {schema: {$ref: "#/components/schemas/Auction"}}}},
          400: {description: "Validation error"}
        }
      }
    },
    "/auctions/{id}": {
      get: {
        summary: "Get auction",
        parameters: [{name: "id", in: "path", required: true, schema: {type: "string"}}],
        responses: {
          200: {description: "Found", content: {"application/json": {schema: {$ref: "#/components/schemas/Auction"}}}},
          404: {description: "Not found"}
        }
      },
      delete: {
        summary: "Delete auction",
        parameters: [{name: "id", in: "path", required: true, schema: {type: "string"}}],
        responses: {204: {description: "Deleted"}, 404: {description: "Not found"}}
      }
    },
    "/auctions/{id}/status": {
      put: {
        summary: "Update status",
        parameters: [{name: "id", in: "path", required: true, schema: {type: "string"}}],
        requestBody: {
          required: true,
          content: {"application/json": {schema: {$ref: "#/components/schemas/AuctionStatusUpdate"}}}
        },
        responses: {
          200: {description: "Updated", content: {"application/json": {schema: {$ref: "#/components/schemas/Auction"}}}},
          400: {description: "Validation error"},
          404: {description: "Not found"}
        }
      }
    },
    "/auctions/{id}/close": {
      post: {
        summary: "Close auction and set awaiting_payment for winner",
        parameters: [{name: "id", in: "path", required: true, schema: {type: "string"}}],
        responses: {
          200: {description: "Closed for payment", content: {"application/json": {schema: {$ref: "#/components/schemas/Auction"}}}},
          204: {description: "Deleted (no bids)"},
          404: {description: "Not found"}
        }
      }
    },
    "/auctions/{id}/expire": {
      post: {
        summary: "Expire awaiting_payment (reopen or delete if no bids)",
        parameters: [{name: "id", in: "path", required: true, schema: {type: "string"}}],
        responses: {
          200: {description: "Processed", content: {"application/json": {schema: {$ref: "#/components/schemas/Auction"}}}},
          204: {description: "Deleted"},
          404: {description: "Not found"}
        }
      }
    },
    "/auctions/{id}/bids": {
      post: {
        summary: "Place bid",
        parameters: [{name: "id", in: "path", required: true, schema: {type: "string"}}],
        requestBody: {
          required: true,
          content: {"application/json": {schema: {$ref: "#/components/schemas/AuctionBid"}}}
        },
        responses: {
          200: {description: "Accepted", content: {"application/json": {schema: {$ref: "#/components/schemas/Auction"}}}},
          400: {description: "Validation or low bid"},
          404: {description: "Not found"},
          409: {description: "Closed or conflict"}
        }
      }
    }
  },
  components: {
    schemas: {
      Auction: {
        type: "object",
        properties: {
          id: {type: "string"},
          productId: {type: "string"},
          productTitle: {type: "string"},
          sellerId: {type: "string"},
          sellerName: {type: "string"},
          description: {type: "string"},
          category: {type: "string"},
          imageBase64: {type: "string"},
          startPrice: {type: "number"},
          minIncrement: {type: "number"},
          endsAt: {type: "string", format: "date-time"},
          status: {type: "string"},
          currentAmount: {type: "number", nullable: true},
          leadingBidder: {type: "string"},
          currentWinnerId: {type: "string"},
          currentWinnerName: {type: "string"},
          bids: {
            type: "array",
            items: {
              type: "object",
              properties: {
                amount: {type: "number"},
                bidderId: {type: "string"},
                bidderName: {type: "string"},
                createdAt: {type: "string", format: "date-time"}
              }
            }
          }
        }
      },
      AuctionCreate: {
        type: "object",
        required: ["productId","productTitle","startPrice","minIncrement","endsAt"],
        properties: {
          productId: {type: "string"},
          productTitle: {type: "string"},
          sellerId: {type: "string"},
          sellerName: {type: "string"},
          description: {type: "string"},
          category: {type: "string"},
          imageBase64: {type: "string"},
          startPrice: {type: "number"},
          minIncrement: {type: "number"},
          endsAt: {type: "string", format: "date-time"}
        }
      },
      AuctionBid: {
        type: "object",
        required: ["bidderId","bidderName","amount"],
        properties: {
          bidderId: {type: "string"},
          bidderName: {type: "string"},
          amount: {type: "number"}
        }
      },
      AuctionStatusUpdate: {
        type: "object",
        required: ["status"],
        properties: {status: {type: "string", enum: ["open","awaiting_payment","closed","cancelled"]}}
      }
    }
  }
}

export function swaggerMiddleware(): RequestHandler[] {
  return [...(swaggerUi.serve as RequestHandler[]), swaggerUi.setup(swaggerSpec)]
}
