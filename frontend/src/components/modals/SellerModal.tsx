import {useApp} from "../../state/appStore"
import {Editable} from "../shared/Editable"

export function SellerModal() {
  const {sellerModal, closeSellerModal, saveSellerModal, setSellerModal, deleteProduct} = useApp()
  if (!sellerModal) return null

  const draft = sellerModal.draft
  return (
    <div className="modal" onClick={closeSellerModal}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={closeSellerModal}>X</button>
        <div className="modal-body">
          {draft.imageBase64 && <img src={draft.imageBase64} className="hero-image" alt={draft.title || "image"} />}
          {!draft.imageBase64 && <div className="hero-image placeholder">No image</div>}
          <div className="modal-info spaced">
            {!sellerModal.editMode && (
              <>
                <div>
                  <h3 style={{margin:0}}>{draft.title}</h3>
                  <p className="badge">{draft.category}</p>
                  <p style={{margin:0}}>{draft.description}</p>
                </div>
                <div className="modal-footer">
                  <div className="price big">
                    <span className="now">${(draft.discountedPrice ?? 0).toFixed(2)}</span>
                    {typeof draft.discountPercent === "number" && draft.discountPercent > 0 && (
                      <div className="old-price">
                        <span className="was">${(draft.price ?? 0).toFixed(2)}</span>
                        <span className="discount">-{draft.discountPercent}%</span>
                      </div>
                    )}
                  </div>
                  <div className="row space actions-bottom">
                    <button onClick={() => setSellerModal((prev: any) => prev ? {...prev, editMode:true} : prev)}>Edit</button>
                    <button className="danger" onClick={() => deleteProduct(sellerModal.product.id)}>Delete</button>
                  </div>
                </div>
              </>
            )}
            {sellerModal.editMode && (
              <>
                <Editable label="Title" value={draft.title || ""} onChange={v => setSellerModal((prev: any) => prev ? {...prev, draft:{...prev.draft, title:v}, dirty:true} : prev)} />
                <Editable label="Category" value={draft.category || ""} onChange={v => setSellerModal((prev: any) => prev ? {...prev, draft:{...prev.draft, category:v}, dirty:true} : prev)} />
                <Editable label="Description" value={draft.description || ""} multiline onChange={v => setSellerModal((prev: any) => prev ? {...prev, draft:{...prev.draft, description:v}, dirty:true} : prev)} />
                <Editable label="Price" value={String(draft.price ?? "")} onChange={v => setSellerModal((prev: any) => prev ? {...prev, draft:{...prev.draft, price:Number(v)}, dirty:true} : prev)} />
                <Editable label="Discount %" value={String(draft.discountPercent ?? "")} onChange={v => setSellerModal((prev: any) => prev ? {...prev, draft:{...prev.draft, discountPercent:Number(v)}, dirty:true} : prev)} />
                <div className="field-row">
                  <div className="row space">
                    <span className="field-label">Image</span>
                  </div>
                  <input type="file" accept="image/*" onChange={async e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const data = await readFile(file)
                      setSellerModal((prev: any) => prev ? {...prev, draft:{...prev.draft, imageBase64:data}, dirty:true} : prev)
                    }
                  }} />
                </div>
                <div className="modal-footer">
                  <div />
                  <div className="row space actions-bottom">
                    <button onClick={() => setSellerModal((prev: any) => prev ? {...prev, editMode:false, draft:{...prev.product}, dirty:false} : prev)}>Cancel</button>
                    {sellerModal.dirty && <button onClick={saveSellerModal}>Save</button>}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function readFile(file: File) {
  return new Promise<string>((resolve,reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
