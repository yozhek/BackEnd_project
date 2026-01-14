import {useState} from "react"
import {useApp} from "../../state/appStore"

export function AuctionModal() {
  const {
    selectedAuction,
    closeAuctionModal,
    placeBid,
    isBuyer,
    isSeller,
    userId,
    deleteAuction,
    closeAuction,
    setError
  } = useApp()
  const [amount,setAmount] = useState("")
  if (!selectedAuction) return null
  const auction = selectedAuction

  const current = auction.currentAmount ?? auction.startPrice
  const minBid = Number((current + auction.minIncrement).toFixed(2))
  const canBid = isBuyer && auction.status === "open"
  const isOwner = isSeller && userId && auction.sellerId === userId
  const canClose = auction.status === "open" && (auction.bids?.length || 0) > 0
  const isSellerProfile = window.location.pathname.startsWith("/seller")

  async function submit() {
    const val = Number(amount)
    if (!Number.isFinite(val) || val < minBid) return
    await placeBid(auction.id, val)
    setAmount("")
  }

  return (
    <div className="modal">
      <div className="modal-card">
        <button className="close" type="button" aria-label="Close" onClick={closeAuctionModal}>X</button>
        <div className="modal-body">
          <div>
            {auction.imageBase64 ? (
              <img src={auction.imageBase64} alt={auction.productTitle} className="hero-image" />
            ) : (
              <div className="hero-image">No image</div>
            )}
          </div>
          <div className="modal-info" style={{position:"relative"}}>
            <div style={{display:"flex", flexDirection:"column", gap:"6px", marginBottom:"8px"}}>
              <h2 style={{margin:0}}>{auction.productTitle}</h2>
              {auction.category && <p className="badge" style={{width:"fit-content"}}>{auction.category}</p>}
              <p className="muted small" style={{display:"flex", gap:"6px", alignItems:"center"}}>
                <span>Status:</span> <span className={`pill ${auction.status === "awaiting_payment" ? "warn" : ""}`}>{auction.status}</span>
              </p>
              <p className="muted small" style={{display:"flex", gap:"6px", alignItems:"center"}}>
                <span>Seller:</span> <span className="pill">{auction.sellerName || auction.sellerId}</span>
              </p>
              {auction.description && <p className="muted" style={{marginTop:"8px"}}>{auction.description}</p>}
            </div>
            <div style={{display:"flex", flexDirection:"column", gap:"4px", alignItems:"center", textAlign:"center", flex:1, width:"100%", justifyContent:"center"}}>
              <div className="bids-list scrollable" style={{marginTop:"0", textAlign:"center", width:"100%"}}>
                {auction.bids?.slice().reverse().map((b,idx) => (
                  <div key={idx} className="bid-row" style={{justifyContent:"center", gap:"14px"}}>
                    <span>{b.bidderName}</span>
                    <span>${b.amount.toFixed(2)}</span>
                  </div>
                ))}
                {!auction.bids?.length && <div className="muted small">No bids yet</div>}
              </div>
              <div className="muted small" style={{alignSelf:"flex-start"}}>Ends: {new Date(auction.endsAt).toLocaleString()}</div>
              {canBid && (
                <div className="bid-action" style={{marginTop:"6px", justifyContent:"center", width:"100%"}}>
                  <input
                    className="input-rounded"
                    type="number"
                    min={minBid}
                    step={auction.minIncrement}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder={`Min ${minBid}`}
                  />
                  <button className="primary" onClick={submit}>Place bid</button>
                </div>
              )}
            </div>
            <div className="actions-bottom">
              {isOwner && isSellerProfile && (
                <div className="row space" style={{marginTop:"auto", alignItems:"center"}}>
                  <div className="price">
                    <span className="now">${current.toFixed(2)}</span>
                    <div className="muted">Min step ${auction.minIncrement}</div>
                  </div>
                  <div className="row" style={{gap:"8px"}}>
                    <button className="danger" onClick={() => { deleteAuction(auction.id); closeAuctionModal() }}>Delete</button>
                    <button
                      className="primary"
                      onClick={() => {
                        if (!canClose) { setError("Cannot close auction without bids"); return }
                        closeAuction(auction.id); closeAuctionModal()
                      }}
                    >Close auction</button>
                  </div>
                </div>
              )}
              {!isSellerProfile && !canBid && (
                <div style={{marginTop:"auto", width:"100%"}}>
                  <div className="note" style={{textAlign:"center"}}>Only buyers can bid and auction must be open.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
