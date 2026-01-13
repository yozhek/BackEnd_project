import "./style.css"
import {Header} from "./components/Header"
import {Alerts} from "./components/Alerts"
import {HomeView} from "./views/HomeView"
import {SellersView} from "./views/SellersView"
import {CartView} from "./views/CartView"
import {BuyerProfileView} from "./views/BuyerProfileView"
import {SellerProfileView} from "./views/SellerProfileView"
import {AuctionsView} from "./views/AuctionsView"
import {ProductModal} from "./components/modals/ProductModal"
import {SellerModal} from "./components/modals/SellerModal"
import {AuctionModal} from "./components/modals/AuctionModal"
import {AppProvider, useApp} from "./state/appStore"
import {Routes,Route, useLocation} from "react-router-dom"
import {useAuth} from "./state/authStore"
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
    if (location.pathname.startsWith("/auctions")) return "auctions"
    return "home"
  })()

  return (
    <div className="layout">
      <Header activeTab={active} />
      <Alerts />
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/sellers" element={<SellersView />} />
        <Route path="/auctions" element={<AuctionsView />} />
        <Route path="/cart" element={<CartView />} />
        <Route path="/buyer" element={<BuyerProfileView />} />
        <Route path="/seller" element={<SellerProfileView />} />
      </Routes>
      <ProductModal />
      <SellerModal />
      <AuctionModal />
    </div>
  )
}

function App() {
  const {isAuth, roles} = useAuth()
  const {userId, username, email} = useAuth()

  return (
    <AppProvider auth={{isAuth, roles, userId, username, email}}>
      <Content />
    </AppProvider>
  )
}

export default App
