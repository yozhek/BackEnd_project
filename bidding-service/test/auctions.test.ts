import request from "supertest"
import {describe,it,expect} from "vitest"
import {app} from "../src/api/server"
import {getDb} from "../src/database/mongo"

describe("auctions API", () => {
  it("returns health", async () => {
    const res = await request(app).get("/health")
    expect(res.status).toBe(200)
    expect(res.body.status).toBe("ok")
  })

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

  it("gets auction by id", async () => {
    const created = await createAuction("get-1")
    const res = await request(app).get(`/auctions/${created.body.id}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(created.body.id)
  })

  it("updates status to cancelled", async () => {
    await createAuction("status-1")
    const id = await getIdByProduct("status-1")
    const res = await request(app)
      .put(`/auctions/${id}/status`)
      .send({status:"cancelled"})
    expect(res.status).toBe(200)
    expect(res.body.status).toBe("cancelled")
  })

  it("closes auction without bids (deletes)", async () => {
    await createAuction("close-empty")
    const id = await getIdByProduct("close-empty")
    const res = await request(app).post(`/auctions/${id}/close`)
    expect(res.status).toBe(204)
    const after = await request(app).get(`/auctions/${id}`)
    expect(after.status).toBe(404)
  })

  it("closes auction with bid to awaiting_payment", async () => {
    await createAuction("close-bid")
    const id = await getIdByProduct("close-bid")
    await placeBid(id, 15)
    const res = await request(app).post(`/auctions/${id}/close`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe("awaiting_payment")
  })

  it("expires awaiting payment and reopens", async () => {
    await createAuction("expire-1")
    const id = await getIdByProduct("expire-1")
    await placeBid(id, 20)
    await request(app).post(`/auctions/${id}/close`)
    const res = await request(app).post(`/auctions/${id}/expire?force=true`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe("open")
    expect(res.body.bids.length).toBe(0)
  })

  it("deletes auction", async () => {
    const created = await createAuction("delete-1")
    const res = await request(app).delete(`/auctions/${created.body.id}`)
    expect(res.status).toBe(204)
    const after = await request(app).get(`/auctions/${created.body.id}`)
    expect(after.status).toBe(404)
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

function createAuction(productId: string) {
  const endsAt = new Date(Date.now() + 3600_000).toISOString()
  return request(app)
    .post("/auctions")
    .send({
      productId,
      productTitle:`Title-${productId}`,
      sellerId:`seller-${productId}`,
      sellerName:"Seller",
      startPrice:10,
      minIncrement:1,
      endsAt
    })
    .set("Content-Type","application/json")
}

async function placeBid(id: string, amount: number) {
  return request(app)
    .post(`/auctions/${id}/bids`)
    .send({bidderId:"bidder-1", bidderName:"Bidder", amount})
    .set("Content-Type","application/json")
}

async function getIdByProduct(productId: string) {
  const db = getDb()
  const doc = await db.collection("auctions").findOne({productId})
  if (!doc?._id) throw new Error("auction not found for " + productId)
  return doc._id.toHexString()
}
