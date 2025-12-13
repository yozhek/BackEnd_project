import {useApp} from "../../state/appStore"

export function ProductModal() {
  const {selectedProduct, selectedQty, setSelectedQty, addToCart, closeProductModal} = useApp()
  if (!selectedProduct) return null
  return (
    <div className="modal" onClick={closeProductModal}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={closeProductModal}>X</button>
        <div className="modal-body">
          {selectedProduct.imageBase64 && <img src={selectedProduct.imageBase64} className="hero-image" alt={selectedProduct.title} />}
          {!selectedProduct.imageBase64 && <div className="hero-image placeholder">No image</div>}
          <div className="modal-info spaced">
            <div>
              <h3 style={{margin:0}}>{selectedProduct.title}</h3>
              <p className="badge">{selectedProduct.category}</p>
              <p style={{margin:0}}>{selectedProduct.description}</p>
            </div>
            <div className="modal-footer">
              <div className="price big">
                <span className="now">${selectedProduct.discountedPrice.toFixed(2)}</span>
                {selectedProduct.discountPercent > 0 && (
                  <div className="old-price">
                    <span className="was">${selectedProduct.price.toFixed(2)}</span>
                    <span className="discount">-{selectedProduct.discountPercent}%</span>
                  </div>
                )}
              </div>
              <div className="row space actions-bottom">
                <label className="qty">
                  Qty
                  <input type="number" min="1" value={selectedQty} onChange={e => setSelectedQty(Number(e.target.value) || 1)} />
                </label>
                <button onClick={() => {addToCart(selectedProduct, selectedQty); closeProductModal()}}>Add to cart</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
