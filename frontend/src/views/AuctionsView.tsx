import {useMemo} from "react"
import {useApp} from "../state/appStore"

export function AuctionsView() {
  const {auctions, isBuyer, status, error, clearMessages, wsConnected, refreshAuctions, openAuctionModal} = useApp()

  const cards = useMemo(() => auctions.filter(a => a.status === "open").map(a => ({
    ...a,
    current: a.currentAmount ?? a.startPrice
  })), [auctions])

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Auctions</h2>
          <p className="muted">Live bidding on marketplace products</p>
        </div>
        <div className={`ws-indicator ${wsConnected ? "ok" : "warn"}`}>
          {wsConnected ? "Live updates" : "Offline"}
        </div>
      </div>
      {status && <div className="info-bar success" onClick={clearMessages}>{status}</div>}
      {error && <div className="info-bar error" onClick={clearMessages}>{error}</div>}
      {!isBuyer && <div className="note">Login as buyer to place bids. Viewing is available to everyone.</div>}
      <div className="grid">
        {cards.map(a => (
          <article key={a.id} className="card" onClick={() => openAuctionModal(a)}>
            <div className="card-title">
              <div className="title-block">
                {a.imageBase64 ? <img src={a.imageBase64} className="thumb" alt={a.productTitle} /> : <div className="thumb placeholder">No image</div>}
                <div>
                  <h3>{a.productTitle}</h3>
                  {a.category && <p className="badge">{a.category}</p>}
                  <p className="muted small">Seller: {a.sellerName || a.sellerId}</p>
                </div>
              </div>
              <div className="price">
                <span className="now">${a.current.toFixed(2)}</span>
                <div className="muted small">Min step ${a.minIncrement}</div>
              </div>
            </div>
            <p className="muted small">Ends: {new Date(a.endsAt).toLocaleString()}</p>
          </article>
        ))}
        {!cards.length && <p className="muted">No auctions</p>}
      </div>
    </section>
  )
}
