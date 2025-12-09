import request from "supertest"
import {describe,it,expect} from "vitest"
import {app} from "../src/api/server"

function sampleOrderBody() {
  return {
    customerName: "John Doe",
    items: [
      {productId: "p1", quantity: 2},
      {productId: "p2", quantity: 1}
    ],
    totalPrice: 300,
    status: "pending"
  }
}

describe("orders API", () => {
  it("creates order", async () => {
    const res = await request(app).post("/orders").send(sampleOrderBody())
    expect(res.status).toBe(201)
    expect(res.body.customerName).toBe("John Doe")
    expect(res.body.items.length).toBe(2)
  })

  it("rejects invalid order (empty items)", async () => {
    const res = await request(app).post("/orders").send({customerName:"x", items: [], totalPrice:10})
    expect(res.status).toBe(400)
    expect(res.body.errors).toBeDefined()
  })

  it("lists orders with pagination", async () => {
    await request(app).post("/orders").send(sampleOrderBody())
    await request(app).post("/orders").send(sampleOrderBody())
    const res = await request(app).get("/orders?page=1&limit=1")
    expect(res.status).toBe(200)
    expect(res.body.items.length).toBe(1)
  })

  it("gets order by id", async () => {
    const created = await request(app).post("/orders").send(sampleOrderBody())
    const id = created.body.id
    const res = await request(app).get(`/orders/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(id)
  })

  it("updates order status", async () => {
    const created = await request(app).post("/orders").send(sampleOrderBody())
    const id = created.body.id
    const res = await request(app).put(`/orders/${id}`).send({status:"paid"})
    expect(res.status).toBe(200)
    expect(res.body.status).toBe("paid")
  })

  it("deletes order", async () => {
    const created = await request(app).post("/orders").send(sampleOrderBody())
    const id = created.body.id
    const del = await request(app).delete(`/orders/${id}`)
    expect(del.status).toBe(204)
    const getAfter = await request(app).get(`/orders/${id}`)
    expect(getAfter.status).toBe(404)
  })
})

