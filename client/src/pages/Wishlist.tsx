import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { useStore } from "../context/Store";
import { ProductCard, QuickView, Product } from "../components/ProductCard";
import { EmptyState, PageHeader, ShopSkeleton, Stagger, StaggerItem, Spinner, ProductCardSkeleton } from "../components/ui";

export default function Wishlist() {
  const { toast, refreshCounts, tr, user } = useStore();
  const [items, setItems] = useState<any[] | null>(null);
  const [quick, setQuick] = useState<Product | null>(null);
  const [sharing, setSharing] = useState(false);

  const load = async () => {
    const d = await api<{ items: any[] }>("/wishlist");
    setItems(d.items);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    await api(`/wishlist/${id}`, { method: "DELETE" });
    load(); refreshCounts();
  };
  const moveToCart = async (productId: string, wid: string) => {
    try {
      await api("/cart", { method: "POST", body: { productId, qty: 1 } });
      await api(`/wishlist/${wid}`, { method: "DELETE" });
      toast("Moved to cart", "success");
      load(); refreshCounts();
    } catch (e: any) { toast(e.message, "error"); }
  };
  const share = async () => {
    if (!user) return toast("Login to share your wishlist", "error");
    setSharing(true);
    try {
      const d = await api<{ url: string }>("/wishlist/share", { method: "POST" });
      const full = window.location.origin + d.url;
      await navigator.clipboard.writeText(full).catch(() => {});
      toast("Share link copied: " + full, "success");
    } catch (e: any) { toast(e.message, "error"); }
    setSharing(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 mt-6">
      <PageHeader title={tr("wishlist")} sub={items ? `${items.length} saved item${items.length === 1 ? "" : "s"}` : undefined}
        actions={items && items.length > 0 ? (
          <button className="btn-ghost btn-sm" onClick={share} disabled={sharing}>
            {sharing ? <Spinner size={14} /> : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 12v8h16v-8M16 6l-4-4-4 4M12 2v13" /></svg>
            )}
            Share wishlist
          </button>
        ) : undefined} />
      {items === null ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
      ) : items.length === 0 ? (
        <EmptyState kind="wishlist" title="Your wishlist is empty"
          hint="Tap the heart on any product to save it here for later."
          action={<Link to="/shop" className="btn-primary">Discover products</Link>} />
      ) : (
        <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((i) => (
            <StaggerItem key={i.id}>
              <div className="relative">
                <ProductCard p={i.product} onQuickView={setQuick} />
                <div className="flex gap-2 mt-2.5">
                  <motion.button whileTap={{ scale: 0.96 }} className="btn-primary btn-sm flex-1" onClick={() => moveToCart(i.product.id, i.id)}>Move to cart</motion.button>
                  <button className="btn-ghost btn-sm" onClick={() => remove(i.id)}>{tr("remove")}</button>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      <QuickView p={quick} onClose={() => setQuick(null)} />
    </div>
  );
}

export function SharedWishlist() {
  const { token } = useParams();
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => {
    api(`/wishlist/shared/${token}`).then((d: any) => setItems(d.items)).catch(() => setItems([]));
  }, [token]);
  return (
    <div className="max-w-7xl mx-auto px-4 mt-6">
      <PageHeader title="Shared wishlist" sub={items ? `${items.length} items` : undefined} />
      {items === null ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
      ) : items.length === 0 ? (
        <EmptyState kind="wishlist" title="This wishlist is empty or the link is invalid." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((i) => <ProductCard key={i.id} p={i.product} />)}
        </div>
      )}
      <Link to="/shop" className="btn-ghost mt-8">Browse shop</Link>
    </div>
  );
}
