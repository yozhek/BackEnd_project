import request from "supertest"
import {describe,it,expect} from "vitest"
import {app} from "../src/api/server"
import {getDb} from "../src/database/mongo"

describe("auctions API", () => {
  it("creates auction", async () => {
    const endsAt = new Date(Date.now() + 3600_000).toISOString()
    const res = await request(app)
      .post("/auctions")
      .send({
        productId:"p1",
        productTitle:"Phone",
        sellerId:"seller-1",
        sellerName:"Seller One",
        startPrice:100,
        minIncrement:5,
        endsAt
      })
      .set("Content-Type","application/json")
    expect(res.status).toBe(201)
    expect(res.body.productId).toBe("p1")
    expect(res.body.status).toBe("open")
  })

  it("lists auctions with pagination", async () => {
    const db = getDb()
    await db.collection("auctions").insertMany([
      sampleAuction("A"), sampleAuction("B"), sampleAuction("C")
    ])
    const res = await request(app).get("/auctions?page=1&limit=2")
    expect(res.status).toBe(200)
    expect(res.body.items.length).toBe(2)
  })

  it("places valid bid", async () => {
    const endsAt = new Date(Date.now() + 3600_000).toISOString()
    const created = await request(app)
      .post("/auctions")
      .send({
        productId:"p2",
        productTitle:"Book",
        sellerId:"seller-2",
        sellerName:"Seller Two",
        startPrice:10,
        minIncrement:2,
        endsAt
      })
      .set("Content-Type","application/json")
    const id = created.body.id
    const bid = await request(app)
      .post(`/auctions/${id}/bids`)
      .send({bidderId:"alice-id", bidderName:"Alice", amount:12})
      .set("Content-Type","application/json")
    expect(bid.status).toBe(200)
    expect(bid.body.currentAmount).toBe(12)
  })

  it("rejects low bid", async () => {
    const endsAt = new Date(Date.now() + 3600_000).toISOString()
    const created = await request(app)
      .post("/auctions")
      .send({
        productId:"p3",
        productTitle:"Tablet",
        sellerId:"seller-3",
        sellerName:"Seller Three",
        startPrice:50,
        minIncrement:5,
        endsAt
      })
      .set("Content-Type","application/json")
    const id = created.body.id
    const bid = await request(app)
      .post(`/auctions/${id}/bids`)
      .send({bidderId:"bob-id", bidderName:"Bob", amount:51})
      .set("Content-Type","application/json")
    expect(bid.status).toBe(400)
  })
})

function sampleAuction(productId: string) {
  return {
    productId,
    productTitle:"Sample",
    sellerId:"seller-sample",
    sellerName:"Sample Seller",
    startPrice:10,
    minIncrement:1,
    endsAt:new Date(Date.now() + 3600_000),
    status:"open",
    currentAmount:null,
    bids:[],
    version:1,
    createdAt:new Date(),
    updatedAt:new Date()
  }
}
