import {ChangeEvent} from "react"
import {useApp} from "../state/appStore"

export function SellersView() {
  const {productForm, setProductForm, createProduct} = useApp()

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
        <p className="muted">Create a product with optional discount and image.</p>
      </div>
      <form className="form-grid" onSubmit={createProduct}>
        <label>
          <span>Title</span>
          <input value={productForm.title} onChange={e => setProductForm({...productForm, title:e.target.value})} required />
        </label>
        <label>
          <span>Price</span>
          <input type="number" min="0.01" step="0.01" value={productForm.price} onChange={e => setProductForm({...productForm, price:e.target.value})} required />
        </label>
        <label>
          <span>Discount % (optional)</span>
          <input type="number" min="0.01" max="100" step="0.01" value={productForm.discountPercent} onChange={e => setProductForm({...productForm, discountPercent:e.target.value})} placeholder="Leave empty for no discount" />
        </label>
        <label>
          <span>Category</span>
          <input value={productForm.category} onChange={e => setProductForm({...productForm, category:e.target.value})} required />
        </label>
        <label className="wide">
          <span>Description</span>
          <textarea value={productForm.description} onChange={e => setProductForm({...productForm, description:e.target.value})} rows={3} required />
        </label>
        <label className="wide">
          <span>Image</span>
          <input type="file" accept="image/*" onChange={onFileChange} />
          {productForm.imageBase64 && <img src={productForm.imageBase64} className="preview" alt="preview" />}
        </label>
        <div className="actions">
          <button type="submit">Publish product</button>
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
