import "./style.css"
import {Header} from "./components/Header"
import {Alerts} from "./components/Alerts"
import {HomeView} from "./views/HomeView"
import {SellersView} from "./views/SellersView"
import {CartView} from "./views/CartView"
import {BuyerProfileView} from "./views/BuyerProfileView"
import {SellerProfileView} from "./views/SellerProfileView"
import {ProductModal} from "./components/modals/ProductModal"
import {SellerModal} from "./components/modals/SellerModal"
import {AppProvider, useApp} from "./state/appStore"
import {Routes,Route, useLocation} from "react-router-dom"
import {useEffect} from "react"

function Content() {
  const location = useLocation()
  const {clearMessages} = useApp() as any

  useEffect(() => { clearMessages() }, [location.pathname])

  const active = (() => {
    if (location.pathname.startsWith("/sellers")) return "sellers"
    if (location.pathname.startsWith("/cart")) return "cart"
    if (location.pathname.startsWith("/buyer")) return "buyer"
    if (location.pathname.startsWith("/seller")) return "sellerProfile"
    return "home"
  })()

  return (
    <div className="layout">
      <Header activeTab={active} />
      <Alerts />
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/sellers" element={<SellersView />} />
        <Route path="/cart" element={<CartView />} />
        <Route path="/buyer" element={<BuyerProfileView />} />
        <Route path="/seller" element={<SellerProfileView />} />
      </Routes>
      <ProductModal />
      <SellerModal />
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <Content />
    </AppProvider>
  )
}

export default App
