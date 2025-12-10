import request from "supertest"
import {describe,it,expect} from "vitest"
import {app} from "../src/api/server"

async function createProduct(body: any) {
  const res = await request(app).post("/products").send(body).set("Content-Type","application/json")
  return res.body.id
}

describe("orders API", () => {
  it("creates order", async () => {
    const prod1 = await createProduct({title:"A", price:100, discountPercent:10, category:"c"})
    const prod2 = await createProduct({title:"B", price:50, category:"c"})
    const res = await request(app).post("/orders").send({
      customerName: "John Doe",
      items: [
        {productId: prod1, quantity: 2},
        {productId: prod2, quantity: 1}
      ],
      status: "pending"
    })
    expect(res.status).toBe(201)
    expect(res.body.customerName).toBe("John Doe")
    expect(res.body.items.length).toBe(2)
    expect(res.body.totalPrice).toBe(230)
  })

  it("rejects invalid order (empty items)", async () => {
    const res = await request(app).post("/orders").send({customerName:"x", items: [], status:"pending"})
    expect(res.status).toBe(400)
    expect(res.body.errors).toBeDefined()
  })

  it("rejects order with unknown product", async () => {
    const res = await request(app).post("/orders").send({
      customerName: "X",
      items: [{productId: "000000000000000000000000", quantity: 1}],
      status: "pending"
    })
    expect(res.status).toBe(400)
  })

  it("lists orders with pagination", async () => {
    const prod = await createProduct({title:"A", price:10, category:"c"})
    await request(app).post("/orders").send({customerName:"A", items:[{productId: prod, quantity:1}], status:"pending"})
    await request(app).post("/orders").send({customerName:"B", items:[{productId: prod, quantity:1}], status:"pending"})
    const res = await request(app).get("/orders?page=1&limit=1")
    expect(res.status).toBe(200)
    expect(res.body.items.length).toBe(1)
  })

  it("gets order by id", async () => {
    const prod = await createProduct({title:"A", price:10, category:"c"})
    const created = await request(app).post("/orders").send({customerName:"X", items:[{productId: prod, quantity:1}], status:"pending"})
    const id = created.body.id
    const res = await request(app).get(`/orders/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(id)
  })

  it("updates order status", async () => {
    const prod = await createProduct({title:"A", price:10, category:"c"})
    const created = await request(app).post("/orders").send({customerName:"X", items:[{productId: prod, quantity:1}], status:"pending"})
    const id = created.body.id
    const res = await request(app).put(`/orders/${id}`).send({status:"paid"})
    expect(res.status).toBe(200)
    expect(res.body.status).toBe("paid")
  })

  it("deletes order", async () => {
    const prod = await createProduct({title:"A", price:10, category:"c"})
    const created = await request(app).post("/orders").send({customerName:"X", items:[{productId: prod, quantity:1}], status:"pending"})
    const id = created.body.id
    const del = await request(app).delete(`/orders/${id}`)
    expect(del.status).toBe(204)
    const getAfter = await request(app).get(`/orders/${id}`)
    expect(getAfter.status).toBe(404)
  })
})
