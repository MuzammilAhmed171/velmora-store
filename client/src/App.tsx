import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ChatWidget from "./components/ChatWidget";
import { Toasts, EASE } from "./components/ui";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductPage from "./pages/Product";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import TrackOrder, { OrderDetailPage } from "./pages/TrackOrder";
import Wishlist, { SharedWishlist } from "./pages/Wishlist";
import { Deals, Auctions, AuctionDetail } from "./pages/Deals";
import Help from "./pages/Help";
import { Blog, BlogPost } from "./pages/Blog";
import { Login, Signup, Forgot } from "./pages/Auth";
import Account, { TicketThread, NotificationsPage } from "./pages/Account";
import Admin from "./pages/Admin";
import { SellerRegister, SellerDashboard } from "./pages/Seller";

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, search]);
  return null;
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.32, ease: EASE }}
    >
      {children}
    </motion.main>
  );
}

export default function App() {
  const loc = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <Header />
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={loc} key={loc.pathname}>
            <Route path="/" element={<Page><Home /></Page>} />
            <Route path="/shop" element={<Page><Shop /></Page>} />
            <Route path="/product/:slug" element={<Page><ProductPage /></Page>} />
            <Route path="/cart" element={<Page><Cart /></Page>} />
            <Route path="/checkout" element={<Page><Checkout /></Page>} />
            <Route path="/track" element={<Page><TrackOrder /></Page>} />
            <Route path="/order/:id" element={<Page><OrderDetailPage /></Page>} />
            <Route path="/wishlist" element={<Page><Wishlist /></Page>} />
            <Route path="/wishlist/shared/:token" element={<Page><SharedWishlist /></Page>} />
            <Route path="/deals" element={<Page><Deals /></Page>} />
            <Route path="/auctions" element={<Page><Auctions /></Page>} />
            <Route path="/auctions/:id" element={<Page><AuctionDetail /></Page>} />
            <Route path="/blog" element={<Page><Blog /></Page>} />
            <Route path="/blog/:slug" element={<Page><BlogPost /></Page>} />
            <Route path="/help" element={<Page><Help /></Page>} />
            <Route path="/login" element={<Page><Login /></Page>} />
            <Route path="/signup" element={<Page><Signup /></Page>} />
            <Route path="/forgot" element={<Page><Forgot /></Page>} />
            <Route path="/notifications" element={<Page><NotificationsPage /></Page>} />
            <Route path="/account" element={<Page><Account /></Page>} />
            <Route path="/account/:tab" element={<Page><Account /></Page>} />
            <Route path="/account/tickets/:id" element={<Page><TicketThread /></Page>} />
            <Route path="/sell" element={<Page><SellerRegister /></Page>} />
            <Route path="/seller" element={<Page><SellerDashboard /></Page>} />
            <Route path="/admin" element={<Page><Admin /></Page>} />
            <Route path="/admin/:tab" element={<Page><Admin /></Page>} />
            <Route path="*" element={<Page><NotFound /></Page>} />
          </Routes>
        </AnimatePresence>
      </div>
      <Footer />
      <ChatWidget />
      <Toasts />
    </div>
  );
}

function NotFound() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto px-4 py-28 text-center">
      <p className="text-7xl font-extrabold text-gradient">404</p>
      <p className="text-slate-500 mt-3 mb-7">This page doesn't exist or was moved.</p>
      <Navigate to="/" replace />
    </motion.div>
  );
}
