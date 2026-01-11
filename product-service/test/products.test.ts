import request from "supertest"
import {describe,it,expect} from "vitest"
import {app} from "../src/api/server"
import {getDb} from "../src/database/mongo"

describe("products API", () => {
  it("creates product with discount and computes discountedPrice", async () => {
    const res = await request(app)
      .post("/products")
      .send({title:"Phone", price:500, discountPercent:10, category:"electronics", description:"Smartphone", imageBase64:"data:image/png;base64,xx"})
      .set("Content-Type","application/json")
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      title:"Phone",
      price:500,
      discountPercent:10,
      discountedPrice:450,
      category:"electronics",
      description:"Smartphone",
      imageBase64:"data:image/png;base64,xx"
    })
  })

  it("creates product without discount (discountPercent defaults to 0)", async () => {
    const res = await request(app)
      .post("/products")
      .send({title:"PC", price:1000, category:"electronics", description:"Desktop PC"})
      .set("Content-Type","application/json")
    expect(res.status).toBe(201)
    expect(res.body.discountPercent).toBe(0)
    expect(res.body.discountedPrice).toBe(1000)
    expect(res.body.description).toBe("Desktop PC")
  })

  it("rejects invalid input (discountPercent 0 when provided)", async () => {
    const res = await request(app)
      .post("/products")
      .send({title:"X", price:100, discountPercent:0, category:"electronics", description:"Bad"})
      .set("Content-Type","application/json")
    expect(res.status).toBe(400)
    expect(res.body.errors).toBeDefined()
  })

  it("lists products with pagination", async () => {
    const db = getDb()
    await db.collection("products").insertMany([
      {title:"A", price:10, discountPercent:0, discountedPrice:10, category:"c", description:"d", createdAt:new Date(), updatedAt:new Date()},
      {title:"B", price:20, discountPercent:0, discountedPrice:20, category:"c", description:"d", createdAt:new Date(), updatedAt:new Date()},
      {title:"C", price:30, discountPercent:0, discountedPrice:30, category:"c", description:"d", createdAt:new Date(), updatedAt:new Date()}
    ])
    const res = await request(app).get("/products?page=1&limit=2")
    expect(res.status).toBe(200)
    expect(res.body.items.length).toBe(2)
  })

  it("rejects invalid pagination query", async () => {
    const res = await request(app).get("/products?page=0&limit=200")
    expect(res.status).toBe(400)
    expect(res.body.errors).toBeDefined()
  })

  it("gets product by id", async () => {
    const create = await request(app)
      .post("/products")
      .send({title:"Phone", price:500, discountPercent:10, category:"electronics", description:"Smartphone"})
      .set("Content-Type","application/json")
    const id = create.body.id
    const res = await request(app).get(`/products/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(id)
  })

  it("updates product and recomputes discountedPrice", async () => {
    const create = await request(app)
      .post("/products")
      .send({title:"Phone", price:500, discountPercent:10, category:"electronics", description:"Smartphone"})
      .set("Content-Type","application/json")
    const id = create.body.id
    const res = await request(app)
      .put(`/products/${id}`)
      .send({price:1000})
      .set("Content-Type","application/json")
    expect(res.status).toBe(200)
    expect(res.body.discountedPrice).toBe(900)
  })

  it("deletes product", async () => {
    const create = await request(app)
      .post("/products")
      .send({title:"Phone", price:500, discountPercent:10, category:"electronics", description:"To delete"})
      .set("Content-Type","application/json")
    const id = create.body.id
    const res = await request(app).delete(`/products/${id}`)
    expect(res.status).toBe(204)
    const getRes = await request(app).get(`/products/${id}`)
    expect(getRes.status).toBe(404)
  })
})
