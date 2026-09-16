/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, Order, BusinessOwnerSession, FNB_BANKING_DETAILS } from './types';
import { fetchProducts, fetchOwnerOrders, resetDemoDatabase, getStoredOwnerSession, clearStoredOwnerSession } from './api';
import { logoutOwnerFromFirebase } from './firebase';
import { Navbar } from './components/Navbar';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { OrderFormModal } from './components/OrderFormModal';
import { OrderFormView } from './components/OrderFormView';
import { QuickOrderModal } from './components/QuickOrderModal';
import { OrderTrackerView } from './components/OrderTrackerView';
import { BusinessOwnerPortal } from './components/BusinessOwnerPortal';
import { BusinessOwnerLoginModal } from './components/BusinessOwnerLoginModal';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import {
  Search,
  Sparkles,
  Heart,
  CheckCircle2,
  Lock,
  Building2,
  Clock,
  ArrowRight,
  Filter,
  ShieldCheck,
  Package,
  ShoppingBag,
  ShoppingCart,
  Palette,
  CreditCard,
  Truck,
  ChevronRight
} from 'lucide-react';

export default function App() {
  // Navigation & View State ('catalogue' | 'order' | 'tracker' | 'owner')
  const [currentTab, setCurrentTab] = useState<'catalogue' | 'order' | 'tracker' | 'owner'>('catalogue');

  // Products Catalogue State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals State
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [orderProduct, setOrderProduct] = useState<Product | null>(null);
  const [quickOrderProduct, setQuickOrderProduct] = useState<Product | null>(null);
  const [showOwnerLoginModal, setShowOwnerLoginModal] = useState<boolean>(false);

  // Business Owner Session State (Section 2.3)
  const [ownerSession, setOwnerSession] = useState<BusinessOwnerSession | null>(getStoredOwnerSession());

  // Tracking & Owner Notifications State
  const [trackedOrderId, setTrackedOrderId] = useState<string>('ORD-CC-1001');
  const [pendingVerificationsCount, setPendingVerificationsCount] = useState<number>(0);

  // AI Assistant Drawer State
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  // Workflow Overview Banner
  const [showWorkflowBanner, setShowWorkflowBanner] = useState<boolean>(true);

  // Load products & notification counts
  const loadData = async () => {
    setIsLoadingProducts(true);
    try {
      const prods = await fetchProducts();
      setProducts(prods);

      if (ownerSession) {
        try {
          const ordersData = await fetchOwnerOrders('active');
          if (ordersData.counts) {
            setPendingVerificationsCount(ordersData.counts.pending_verification);
          }
        } catch {
          // Ignore if owner session expired
        }
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [ownerSession]);

  const handleResetDemo = async () => {
    if (confirm('Reset the database to clean CozyCup sample data?')) {
      await resetDemoDatabase();
      loadData();
      setTrackedOrderId('ORD-CC-1001');
      setCurrentTab('catalogue');
    }
  };

  const handleTrackOrderFromNavbar = (orderId: string) => {
    setTrackedOrderId(orderId);
    setCurrentTab('tracker');
  };

  const handlePlaceOrderClick = (product: Product) => {
    setOrderProduct(product);
    setCurrentTab('order');
  };

  const handleOwnerLoginSuccess = (session: BusinessOwnerSession) => {
    setOwnerSession(session);
    setShowOwnerLoginModal(false);
    setCurrentTab('owner');
    loadData();
  };

  const handleOwnerLogout = async () => {
    try {
      await logoutOwnerFromFirebase();
    } catch (err) {
      console.warn('Firebase signout notice:', err);
    }
    clearStoredOwnerSession();
    setOwnerSession(null);
    setCurrentTab('catalogue');
  };

  // Route Protection: The dashboard must not be accessible without a valid owner session
  useEffect(() => {
    if (currentTab === 'owner' && !ownerSession) {
      setCurrentTab('catalogue');
      setShowOwnerLoginModal(true);
    }
  }, [currentTab, ownerSession]);

  // If an owner is already logged in, redirect directly to dashboard
  const handleOpenOwnerLogin = () => {
    if (ownerSession) {
      setCurrentTab('owner');
    } else {
      setShowOwnerLoginModal(true);
    }
  };

  // Section 2.3: Redirect non-owner attempting to access owner page
  const handleUnauthorizedOwnerAccess = () => {
    setCurrentTab('catalogue');
    setShowOwnerLoginModal(true);
  };

  // Categories list
  const categories = ['All', 'Crochet', 'Bracelets', 'Custom Orders'];

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.product_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F6FC] text-[#302A38]">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        pendingVerificationsCount={pendingVerificationsCount}
        onTrackOrder={handleTrackOrderFromNavbar}
        onToggleAssistant={() => setIsAssistantOpen((prev) => !prev)}
        isAssistantOpen={isAssistantOpen}
        onResetDemo={handleResetDemo}
        ownerSession={ownerSession}
        onOpenOwnerLogin={handleOpenOwnerLogin}
        onOwnerLogout={handleOwnerLogout}
        onNewCustomOrder={() => {
          setOrderProduct(null);
          setCurrentTab('order');
        }}
      />

      {/* Main Content Stage */}
      <main className="flex-1">
        {/* ======================================================== */}
        {/* TAB 1: VISUAL PRODUCT CATALOGUE */}
        {/* ======================================================== */}
        {currentTab === 'catalogue' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
            {/* 1. HERO SECTION (Section 5) */}
            <div className="bg-white rounded-3xl border border-[#EDE7F8] p-8 sm:p-12 shadow-xs relative overflow-hidden">
              <div className="max-w-3xl relative z-10 space-y-5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#EDE7F8] text-[#6B4FA1] border border-[#B9A7E8]/40">
                  <Sparkles className="w-4 h-4 text-[#6B4FA1]" />
                  <span>🇿🇦 South African Handcrafted Keepsakes & Artisan Mugs</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#302A38] tracking-tight leading-tight">
                  Warmth in Every Stitch, <br />
                  <span className="text-[#6B4FA1]">Soul in Every Bead.</span>
                </h1>

                <p className="text-sm sm:text-base text-[#302A38]/80 leading-relaxed max-w-2xl">
                  CozyCup crafts custom hand-crocheted mug cozies, textured ceramic mugs, and vibrant beaded charm bracelets. Every quote is calculated transparently using verified database prices, and secured through direct FNB payment verification.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    id="hero-place-order-btn"
                    onClick={() => {
                      setOrderProduct(null);
                      setCurrentTab('order');
                    }}
                    className="px-6 py-3 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Place Order</span>
                  </button>

                  <button
                    onClick={() => setCurrentTab('tracker')}
                    className="px-6 py-3 bg-[#F8F6FC] hover:bg-[#EDE7F8] text-[#6B4FA1] border border-[#EDE7F8] text-xs sm:text-sm font-bold rounded-2xl transition inline-flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Track Existing Order</span>
                  </button>
                </div>

                {/* Quick Trust Highlights */}
                <div className="pt-4 border-t border-[#EDE7F8] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold text-[#6B4FA1]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#6B4FA1] shrink-0" />
                    <span>Database-Verified Pricing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#6B4FA1] shrink-0" />
                    <span>Official FNB Verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#6B4FA1] shrink-0" />
                    <span>POPIA Compliant Security</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. FEATURED CATEGORIES (Section 5) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-[#302A38] tracking-tight">Featured Collections</h2>
                  <p className="text-xs text-[#302A38]/70 mt-0.5">Select a category to view items and place your order.</p>
                </div>
                {selectedCategory !== 'All' && (
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className="text-xs font-bold text-[#6B4FA1] hover:underline"
                  >
                    View All Collections
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Category 1: Crochet */}
                <div
                  onClick={() => setSelectedCategory('Crochet')}
                  className={`p-6 rounded-3xl border transition cursor-pointer flex flex-col justify-between space-y-4 ${
                    selectedCategory === 'Crochet'
                      ? 'bg-white border-[#6B4FA1] ring-2 ring-[#6B4FA1]/20 shadow-md'
                      : 'bg-white border-[#EDE7F8] hover:border-[#B9A7E8] hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-[#EDE7F8] text-[#6B4FA1] flex items-center justify-center font-bold">
                      ☕
                    </div>
                    <h3 className="text-base font-bold text-[#302A38]">Crochet & Mugs</h3>
                    <p className="text-xs text-[#302A38]/70 leading-relaxed">
                      Hand-knit yarn cozies, textured hug wraps, and ceramic mug combos keeping your drink warm and stylish.
                    </p>
                  </div>
                  <div className="flex items-center text-xs font-bold text-[#6B4FA1] pt-2">
                    <span>Order Crochet</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>

                {/* Category 2: Bracelets */}
                <div
                  onClick={() => setSelectedCategory('Bracelets')}
                  className={`p-6 rounded-3xl border transition cursor-pointer flex flex-col justify-between space-y-4 ${
                    selectedCategory === 'Bracelets'
                      ? 'bg-white border-[#6B4FA1] ring-2 ring-[#6B4FA1]/20 shadow-md'
                      : 'bg-white border-[#EDE7F8] hover:border-[#B9A7E8] hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-[#EDE7F8] text-[#6B4FA1] flex items-center justify-center font-bold">
                      ✨
                    </div>
                    <h3 className="text-base font-bold text-[#302A38]">Beaded Bracelets</h3>
                    <p className="text-xs text-[#302A38]/70 leading-relaxed">
                      Custom hand-strung South African glass, polymer clay beads, and delicate charm bracelets for all ages.
                    </p>
                  </div>
                  <div className="flex items-center text-xs font-bold text-[#6B4FA1] pt-2">
                    <span>Order Bracelets</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>

                {/* Category 3: Custom Orders */}
                <div
                  onClick={() => setSelectedCategory('Custom Orders')}
                  className={`p-6 rounded-3xl border transition cursor-pointer flex flex-col justify-between space-y-4 ${
                    selectedCategory === 'Custom Orders'
                      ? 'bg-white border-[#6B4FA1] ring-2 ring-[#6B4FA1]/20 shadow-md'
                      : 'bg-white border-[#EDE7F8] hover:border-[#B9A7E8] hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-[#EDE7F8] text-[#6B4FA1] flex items-center justify-center font-bold">
                      🎨
                    </div>
                    <h3 className="text-base font-bold text-[#302A38]">Custom Orders</h3>
                    <p className="text-xs text-[#302A38]/70 leading-relaxed">
                      Bespoke colourways and custom gift sets. Includes our special color sourcing buffer (+4 days) for perfection.
                    </p>
                  </div>
                  <div className="flex items-center text-xs font-bold text-[#6B4FA1] pt-2">
                    <span>Order Custom</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. HOW IT WORKS (Section 5) */}
            <div className="bg-white rounded-3xl border border-[#EDE7F8] p-8 sm:p-10 shadow-xs space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B4FA1] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simple 4-Step Process</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#302A38]">How CozyCup Works</h2>
                <p className="text-xs sm:text-sm text-[#302A38]/70">
                  From custom selection to your doorstep — transparent, simple, and secure.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                {/* Step 1 */}
                <div className="bg-[#F8F6FC] rounded-2xl p-5 border border-[#EDE7F8] space-y-3 relative">
                  <div className="w-8 h-8 rounded-xl bg-[#6B4FA1] text-white text-xs font-black flex items-center justify-center">
                    1
                  </div>
                  <h3 className="text-sm font-bold text-[#302A38]">Browse & Select</h3>
                  <p className="text-xs text-[#302A38]/70 leading-relaxed">
                    Pick your favourite item from the visual catalogue, choose your colour or type a bespoke custom shade.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-[#F8F6FC] rounded-2xl p-5 border border-[#EDE7F8] space-y-3 relative">
                  <div className="w-8 h-8 rounded-xl bg-[#6B4FA1] text-white text-xs font-black flex items-center justify-center">
                    2
                  </div>
                  <h3 className="text-sm font-bold text-[#302A38]">Instant Quote</h3>
                  <p className="text-xs text-[#302A38]/70 leading-relaxed">
                    Quote is calculated immediately using database pricing with zero hidden fees. Accept the quote with one click.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="bg-[#F8F6FC] rounded-2xl p-5 border border-[#EDE7F8] space-y-3 relative">
                  <div className="w-8 h-8 rounded-xl bg-[#6B4FA1] text-white text-xs font-black flex items-center justify-center">
                    3
                  </div>
                  <h3 className="text-sm font-bold text-[#302A38]">FNB Direct Deposit</h3>
                  <p className="text-xs text-[#302A38]/70 leading-relaxed">
                    Transfer funds to our official FNB business account using your Order ID as reference and upload your payment slip.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="bg-[#F8F6FC] rounded-2xl p-5 border border-[#EDE7F8] space-y-3 relative">
                  <div className="w-8 h-8 rounded-xl bg-[#6B4FA1] text-white text-xs font-black flex items-center justify-center">
                    4
                  </div>
                  <h3 className="text-sm font-bold text-[#302A38]">Track Live Progress</h3>
                  <p className="text-xs text-[#302A38]/70 leading-relaxed">
                    Follow every milestone from Payment Verified to Handcrafting and Delivery directly from the database tracker.
                  </p>
                </div>
              </div>
            </div>

            {/* End-to-End Workflow Checklist Banner */}
            {showWorkflowBanner && (
              <div className="bg-[#EDE7F8]/70 border border-[#B9A7E8]/50 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#6B4FA1] uppercase tracking-wider">
                      MVI Verified Ordering Scenario
                    </span>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded-full font-bold text-[#6B4FA1] border border-[#B9A7E8]/40">
                      End-to-End Ready
                    </span>
                  </div>
                  <p className="text-xs text-[#302A38]/80 leading-relaxed">
                    1. View Catalogue → 2. Place Order → 3. Validate Info & Calculate Quote → 4. Confirm Order → 5. Accept Quote → 6. FNB Payment Proof → 7. Owner Verifies → 8. Track in DB.
                  </p>
                </div>
                <button
                  onClick={() => setShowWorkflowBanner(false)}
                  className="text-xs text-[#6B4FA1] font-bold hover:underline shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* 4. CATALOGUE FILTER & SEARCH BAR */}
            <div id="catalogue-grid" className="space-y-6 pt-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                        selectedCategory === cat
                          ? 'bg-[#6B4FA1] text-white shadow-xs'
                          : 'bg-white text-[#302A38]/70 hover:bg-[#EDE7F8] hover:text-[#302A38] border border-[#EDE7F8]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative max-w-xs w-full">
                  <Search className="w-4 h-4 text-[#6B4FA1] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search catalogue items..."
                    className="w-full bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl pl-9 pr-3 py-2 text-xs text-[#302A38] focus:outline-none focus:ring-2 focus:ring-[#B9A7E8]/30 transition"
                  />
                </div>
              </div>

            {/* Products Grid */}
            {isLoadingProducts ? (
              <div className="py-20 text-center text-xs text-[#6B4FA1] font-semibold">
                Loading CozyCup catalogue...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#EDE7F8] p-12 text-center text-xs text-[#302A38]/60 space-y-2">
                <Package className="w-8 h-8 text-[#6B4FA1] mx-auto opacity-50" />
                <p>No products match your search query.</p>
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setSearchQuery('');
                  }}
                  className="text-[#6B4FA1] font-bold hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((p) => (
                  <ProductCard
                    key={p.product_id}
                    product={p}
                    onSelectProduct={(prod) => setDetailProduct(prod)}
                    onPlaceOrder={(prod) => handlePlaceOrderClick(prod)}
                    onQuickOrder={(prod) => setQuickOrderProduct(prod)}
                  />
                ))}
              </div>
            )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: PLACE / CUSTOM ORDER (FIX 2)                        */}
        {/* ======================================================== */}
        {currentTab === 'order' && (
          <OrderFormView
            initialProduct={orderProduct}
            products={products}
            onOrderCreated={(created) => {
              setTrackedOrderId(created.order_id);
              loadData();
            }}
            onNavigateToTracker={(orderId) => {
              setTrackedOrderId(orderId);
              setCurrentTab('tracker');
            }}
            onNavigateToCatalogue={() => setCurrentTab('catalogue')}
          />
        )}

        {/* ======================================================== */}
        {/* TAB 2: ORDER TRACKER */}
        {/* ======================================================== */}
        {currentTab === 'tracker' && (
          <OrderTrackerView
            initialOrderId={trackedOrderId}
            onNavigateToCatalogue={() => setCurrentTab('catalogue')}
          />
        )}

        {/* ======================================================== */}
        {/* TAB 3: BUSINESS OWNER PORTAL (Protected, Section 2.3) */}
        {/* ======================================================== */}
        {currentTab === 'owner' && (
          <BusinessOwnerPortal
            ownerSession={ownerSession}
            onNavigateToTracker={(orderId) => {
              setTrackedOrderId(orderId);
              setCurrentTab('tracker');
            }}
            onUnauthorizedRedirect={handleUnauthorizedOwnerAccess}
          />
        )}
      </main>

      {/* Global Modals */}

      {/* 1. Product Detail Modal */}
      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onPlaceOrder={(prod) => {
          setDetailProduct(null);
          setOrderProduct(prod);
          setCurrentTab('order');
        }}
      />

      {/* 2. Order Form Modal (End-to-End MVI Criteria) */}
      <OrderFormModal
        isOpen={Boolean(orderProduct)}
        initialProduct={orderProduct}
        products={products}
        onClose={() => setOrderProduct(null)}
        onOrderCreated={(created) => {
          setTrackedOrderId(created.order_id);
          loadData();
        }}
        onNavigateToTracker={(orderId) => {
          setOrderProduct(null);
          setTrackedOrderId(orderId);
          setCurrentTab('tracker');
        }}
        onNavigateToOwner={() => {
          setOrderProduct(null);
          setCurrentTab('owner');
        }}
      />

      {/* 3. Quick Order Express Modal */}
      <QuickOrderModal
        product={quickOrderProduct}
        isOpen={!!quickOrderProduct}
        onClose={() => setQuickOrderProduct(null)}
        onOrderCompleted={(order) => {
          setTrackedOrderId(order.order_id);
          loadData();
        }}
        onNavigateToTracker={(orderId) => {
          setQuickOrderProduct(null);
          setTrackedOrderId(orderId);
          setCurrentTab('tracker');
        }}
      />

      {/* 4. Business Owner Login Modal (Restricted Auth) */}
      <BusinessOwnerLoginModal
        isOpen={showOwnerLoginModal}
        onClose={() => setShowOwnerLoginModal(false)}
        onLoginSuccess={handleOwnerLoginSuccess}
      />

      {/* 4. Supporting AI Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        currentOrderId={trackedOrderId}
        onTrackOrder={(id) => {
          setTrackedOrderId(id);
          setCurrentTab('tracker');
        }}
      />

      {/* Floating AI Assistant Trigger Button (Accessible on all customer pages) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          id="floating-ai-assistant-btn"
          onClick={() => setIsAssistantOpen((prev) => !prev)}
          className="group flex items-center gap-2 px-4 py-3 bg-[#6B4FA1] hover:bg-[#5A3F8C] text-white rounded-full shadow-lg hover:shadow-xl border-2 border-white/20 transition-all duration-200 active:scale-95 cursor-pointer"
          aria-label="Open CozyCup AI Assistant"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
          </div>
          <span className="text-xs font-bold tracking-wide">
            {isAssistantOpen ? 'Close Assistant' : 'Ask Assistant'}
          </span>
        </button>
      </div>

      {/* Footer with POPIA & FNB Banking Details */}
      <footer className="bg-white border-t border-[#EDE7F8] py-8 mt-12 text-xs text-[#302A38]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#EDE7F8] text-[#6B4FA1] flex items-center justify-center font-bold">
                <Heart className="w-3.5 h-3.5 fill-[#B9A7E8] text-[#6B4FA1]" />
              </div>
              <span className="font-bold text-[#302A38]">CozyCup Handmade Crochet & Bracelets</span>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <span>Official FNB Bank Account</span>
              <span>•</span>
              <span>POPIA Act Compliant</span>
              <span>•</span>
              <button
                onClick={handleOpenOwnerLogin}
                className="text-[#6B4FA1] font-bold hover:underline"
              >
                Owner Portal
              </button>
            </div>
          </div>

          <div className="text-[11px] text-[#302A38]/50 text-center sm:text-left leading-relaxed border-t border-[#EDE7F8] pt-4">
            CozyCup processes payments strictly through verified First National Bank (FNB) electronic funds transfers (EFT). Customer personal data is handled in accordance with the Protection of Personal Information Act (POPIA).
          </div>
        </div>
      </footer>
    </div>
  );
}
