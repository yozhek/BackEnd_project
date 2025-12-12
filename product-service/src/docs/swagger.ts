import {Request,Response,NextFunction} from "express"
import swaggerUi from "swagger-ui-express"

export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Marketplace API",
    version: "1.0.0",
    description: "Product service endpoints"
  },
  servers: [{url: "http://localhost:3000"}],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          200: {description: "Service is up"}
        }
      }
    },
    "/products": {
      get: {
        summary: "List products",
        parameters: [
          {name: "page", in: "query", schema: {type: "integer", minimum: 1}},
          {name: "limit", in: "query", schema: {type: "integer", minimum: 1, maximum: 100}}
        ],
        responses: {
          200: {
            description: "List of products",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: {type: "array", items: {$ref: "#/components/schemas/Product"}},
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
        summary: "Create product",
        requestBody: {
          required: true,
          content: {
            "application/json": {schema: {$ref: "#/components/schemas/ProductCreate"}}
          }
        },
        responses: {
          201: {description: "Created", content: {"application/json": {schema: {$ref: "#/components/schemas/Product"}}}},
          400: {description: "Validation error"}
        }
      }
    },
    "/products/{id}": {
      get: {
        summary: "Get product by id",
        parameters: [{name: "id", in: "path", required: true, schema: {type: "string"}}],
        responses: {
          200: {description: "Found", content: {"application/json": {schema: {$ref: "#/components/schemas/Product"}}}},
          404: {description: "Not found"}
        }
      },
      put: {
        summary: "Update product",
        parameters: [{name: "id", in: "path", required: true, schema: {type: "string"}}],
        requestBody: {
          required: true,
          content: {"application/json": {schema: {$ref: "#/components/schemas/ProductUpdate"}}}
        },
        responses: {
          200: {description: "Updated", content: {"application/json": {schema: {$ref: "#/components/schemas/Product"}}}},
          400: {description: "Validation error"},
          404: {description: "Not found"}
        }
      },
      delete: {
        summary: "Delete product",
        parameters: [{name: "id", in: "path", required: true, schema: {type: "string"}}],
        responses: {
          204: {description: "Deleted"},
          404: {description: "Not found"}
        }
      }
    }
    ,
    "/orders": {
      get: {
        summary: "List orders",
        parameters: [
          {name: "page", in: "query", schema: {type: "integer", minimum: 1}},
          {name: "limit", in: "query", schema: {type: "integer", minimum: 1, maximum: 100}}
        ],
        responses: {
          200: {
            description: "List of orders",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: {type: "array", items: {$ref: "#/components/schemas/Order"}},
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
        summary: "Create order",
        requestBody: {
          required: true,
          content: {"application/json": {schema: {$ref: "#/components/schemas/OrderCreate"}}}
        },
        responses: {
          201: {description: "Created", content: {"application/json": {schema: {$ref: "#/components/schemas/Order"}}}},
          400: {description: "Validation error"}
        }
      }
    },
    "/orders/{id}": {
      get: {
        summary: "Get order",
        parameters: [{name: "id", in: "path", required: true, schema: {type: "string"}}],
        responses: {
          200: {description: "Found", content: {"application/json": {schema: {$ref: "#/components/schemas/Order"}}}},
          404: {description: "Not found"}
        }
      },
      put: {
        summary: "Update order",
        parameters: [{name: "id", in: "path", required: true, schema: {type: "string"}}],
        requestBody: {
          required: true,
          content: {"application/json": {schema: {$ref: "#/components/schemas/OrderUpdate"}}}
        },
        responses: {
          200: {description: "Updated", content: {"application/json": {schema: {$ref: "#/components/schemas/Order"}}}},
          400: {description: "Validation error"},
          404: {description: "Not found"}
        }
      },
      delete: {
        summary: "Delete order",
        parameters: [{name: "id", in: "path", required: true, schema: {type: "string"}}],
        responses: {
          204: {description: "Deleted"},
          404: {description: "Not found"}
        }
      }
    }
  },
  components: {
    schemas: {
      Product: {
        type: "object",
        properties: {
          id: {type: "string"},
          title: {type: "string"},
          price: {type: "number"},
          discountPercent: {type: "number"},
          discountedPrice: {type: "number"},
          category: {type: "string"},
          description: {type: "string"},
          imageBase64: {type: "string", description: "optional base64 image"}
        }
      },
      ProductCreate: {
        type: "object",
        required: ["title","price","category","description"],
        properties: {
          title: {type: "string"},
          price: {type: "number", minimum: 0},
          discountPercent: {type: "number", minimum: 0, maximum: 100},
          category: {type: "string"},
          description: {type: "string"},
          imageBase64: {type: "string"}
        }
      },
      ProductUpdate: {
        type: "object",
        properties: {
          title: {type: "string"},
          price: {type: "number", minimum: 0},
          discountPercent: {type: "number", minimum: 0, maximum: 100},
          category: {type: "string"},
          description: {type: "string"},
          imageBase64: {type: "string"}
        }
      }
      ,
      OrderItem: {
        type: "object",
        required: ["productId","quantity"],
        properties: {
          productId: {type: "string"},
          quantity: {type: "integer", minimum: 1},
          productTitle: {type: "string"},
          productPrice: {type: "number"}
        }
      },
      Order: {
        type: "object",
        properties: {
          id: {type: "string"},
          items: {type: "array", items: {$ref: "#/components/schemas/OrderItem"}},
          totalPrice: {type: "number", minimum: 0},
          status: {type: "string", enum: ["pending","paid","shipped","cancelled"]}
        }
      },
      OrderCreate: {
        type: "object",
          required: ["items"],
          properties: {
            items: {type: "array", items: {$ref: "#/components/schemas/OrderItem"}},
            status: {type: "string", enum: ["pending","paid","shipped","cancelled"]}
          }
        },
      OrderUpdate: {
        type: "object",
        properties: {
          items: {type: "array", items: {$ref: "#/components/schemas/OrderItem"}},
          status: {type: "string", enum: ["pending","paid","shipped","cancelled"]}
        }
      }
    }
  }
}

type RequestHandler = (req: Request,res: Response,next: NextFunction) => void

export function swaggerMiddleware(): RequestHandler[] {
    return [...swaggerUi.serve, swaggerUi.setup(swaggerSpec)]
}
