import {ChangeEvent, useState} from "react"
import {useApp} from "../state/appStore"
import {api} from "../api/client"

export function SellersView() {
  const {productForm, setProductForm, createProduct, createAuction, isSeller, isAuth, username, email} = useApp()
  const [isAuction,setIsAuction] = useState(false)
  const [startPrice,setStartPrice] = useState("")
  const [minStep,setMinStep] = useState("")
  const [endsAt,setEndsAt] = useState("")

  if (!isSeller) {
    return (
      <section className="panel">
        <h3>Only sellers can access this page.</h3>
        <p className="muted">Login as seller to create products.</p>
      </section>
    )
  }

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const data = await readFile(file)
    setProductForm({...productForm, imageBase64: data})
  }

  return (
    <section className="panel form-panel">
      <div>
        <h2>Seller console</h2>
        <p className="muted">Signed in as {username || "Seller"} {email ? `(${email})` : ""}</p>
        <p className="muted">Create a product with optional discount and image.</p>
      </div>
      <form className="form-grid" onSubmit={async e => {
        if (!isAuction) return createProduct(e)
        e.preventDefault()
        const priceNum = Number(startPrice)
        const stepNum = Number(minStep)
        if (!Number.isFinite(priceNum) || priceNum <= 0) { alert("Start price must be > 0"); return }
        if (!Number.isFinite(stepNum) || stepNum <= 0) { alert("Min step must be > 0"); return }
        if (!endsAt) { alert("End time is required"); return }
        const createdProduct = await api.createProduct({
          title: productForm.title.trim(),
          price: priceNum,
          discountPercent: 0,
          category: productForm.category.trim(),
          description: productForm.description.trim(),
          imageBase64: productForm.imageBase64 || undefined,
          isAuction: true
        })
        await createAuction({
          productId: createdProduct.id,
          productTitle: productForm.title.trim(),
          description: productForm.description.trim(),
          category: productForm.category.trim(),
          imageBase64: productForm.imageBase64 || undefined,
          startPrice: priceNum,
          minIncrement: stepNum,
          endsAt: new Date(endsAt).toISOString()
        })
        setIsAuction(false)
        setStartPrice("")
        setMinStep("")
        setEndsAt("")
        setProductForm({title:"", price:"", discountPercent:"", category:"", description:"", imageBase64:""})
      }}>
        <label>
          <span>Title</span>
          <input value={productForm.title} onChange={e => setProductForm({...productForm, title:e.target.value})} required />
        </label>
        {!isAuction && (
          <>
            <label>
              <span>Price</span>
              <input type="number" min="0.01" step="0.01" value={productForm.price} onChange={e => setProductForm({...productForm, price:e.target.value})} required />
            </label>
            <label>
              <span>Discount % (optional)</span>
              <input type="number" min="0.01" max="100" step="0.01" value={productForm.discountPercent} onChange={e => setProductForm({...productForm, discountPercent:e.target.value})} placeholder="Leave empty for no discount" />
            </label>
          </>
        )}
        <label>
          <span>Category</span>
          <input value={productForm.category} onChange={e => setProductForm({...productForm, category:e.target.value})} required />
        </label>
        <label className="wide">
          <span>Description</span>
          <textarea value={productForm.description} onChange={e => setProductForm({...productForm, description:e.target.value})} rows={3} required />
        </label>
        <label className="checkbox-row">
          <span>List as auction?</span>
          <input type="checkbox" checked={isAuction} onChange={e => setIsAuction(e.target.checked)} />
        </label>
        {isAuction && (
          <>
            <label>
              <span>Start price</span>
              <input type="number" min="0.01" step="0.01" value={startPrice} onChange={e => setStartPrice(e.target.value)} required />
            </label>
            <label>
              <span>Min increment</span>
              <input type="number" min="0.01" step="0.01" value={minStep} onChange={e => setMinStep(e.target.value)} required />
            </label>
            <label>
              <span>Ends at</span>
              <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} required />
            </label>
          </>
        )}
        <label className="wide">
          <span>Image</span>
          <input type="file" accept="image/*" onChange={onFileChange} />
          {productForm.imageBase64 && <img src={productForm.imageBase64} className="preview" alt="preview" />}
        </label>
        <div className="actions">
          <button type="submit" disabled={!isAuth}>{isAuction ? "Publish auction" : "Publish product"}</button>
        </div>
      </form>
    </section>
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
