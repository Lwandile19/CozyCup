import React, { useState } from 'react';
import { Sparkles, Search, ShieldCheck, HelpCircle, Heart, ArrowRight, RotateCcw, LogOut, UserCheck, ShoppingCart } from 'lucide-react';
import { BusinessOwnerSession } from '../types';

interface NavbarProps {
  currentTab: 'catalogue' | 'order' | 'tracker' | 'owner';
  setCurrentTab: (tab: 'catalogue' | 'order' | 'tracker' | 'owner') => void;
  pendingVerificationsCount: number;
  onTrackOrder: (orderId: string) => void;
  onToggleAssistant: () => void;
  isAssistantOpen: boolean;
  onResetDemo: () => void;
  ownerSession: BusinessOwnerSession | null;
  onOpenOwnerLogin: () => void;
  onOwnerLogout: () => void;
  onNewCustomOrder?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  pendingVerificationsCount,
  onTrackOrder,
  onToggleAssistant,
  isAssistantOpen,
  onResetDemo,
  ownerSession,
  onOpenOwnerLogin,
  onOwnerLogout,
  onNewCustomOrder
}) => {
  const [quickOrderId, setQuickOrderId] = useState('');

  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickOrderId.trim()) {
      onTrackOrder(quickOrderId.trim());
      setQuickOrderId('');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EDE7F8] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentTab('catalogue')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EDE7F8] text-[#6B4FA1] border border-[#B9A7E8]/40 flex items-center justify-center font-bold text-lg shadow-xs group-hover:scale-105 transition">
                <Heart className="w-5 h-5 fill-[#B9A7E8] text-[#6B4FA1]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#302A38] text-base tracking-tight leading-none">
                    CozyCup
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EDE7F8] text-[#6B4FA1] border border-[#B9A7E8]/40">
                    Handmade Boutique
                  </span>
                </div>
                <p className="text-[11px] text-[#302A38]/60 leading-tight mt-0.5">
                  Crochet & Beaded Bracelets
                </p>
              </div>
            </button>
          </div>

          {/* Center Quick Track Search Bar */}
          <form onSubmit={handleQuickTrack} className="hidden md:flex items-center max-w-xs w-full">
            <div className="relative w-full">
              <input
                type="text"
                value={quickOrderId}
                onChange={(e) => setQuickOrderId(e.target.value)}
                placeholder="Track Order ID (e.g. ORD-CC-...)"
                className="w-full bg-[#F8F6FC] hover:bg-white focus:bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl pl-9 pr-8 py-1.5 text-xs text-[#302A38] placeholder-[#302A38]/40 focus:outline-none focus:ring-2 focus:ring-[#B9A7E8]/30 transition"
              />
              <Search className="w-3.5 h-3.5 text-[#6B4FA1] absolute left-3 top-2.5" />
              {quickOrderId && (
                <button
                  type="submit"
                  className="absolute right-2 top-2 p-0.5 text-[#6B4FA1] hover:text-[#302A38]"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="flex items-center bg-[#F8F6FC] p-1 rounded-xl border border-[#EDE7F8]">
              <button
                id="nav-catalogue"
                onClick={() => setCurrentTab('catalogue')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  currentTab === 'catalogue'
                    ? 'bg-white text-[#6B4FA1] shadow-xs border border-[#EDE7F8]'
                    : 'text-[#302A38]/70 hover:text-[#302A38]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#6B4FA1]" />
                <span>Catalog</span>
              </button>

              <button
                id="nav-place-order"
                onClick={() => {
                  if (onNewCustomOrder) onNewCustomOrder();
                  else setCurrentTab('order');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  currentTab === 'order'
                    ? 'bg-white text-[#6B4FA1] shadow-xs border border-[#EDE7F8]'
                    : 'text-[#302A38]/70 hover:text-[#302A38]'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5 text-[#6B4FA1]" />
                <span>Place Order</span>
              </button>

              <button
                id="nav-tracker"
                onClick={() => setCurrentTab('tracker')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  currentTab === 'tracker'
                    ? 'bg-white text-[#6B4FA1] shadow-xs border border-[#EDE7F8]'
                    : 'text-[#302A38]/70 hover:text-[#302A38]'
                }`}
              >
                <Search className="w-3.5 h-3.5 text-[#B9A7E8]" />
                <span>Track Order</span>
              </button>

              {ownerSession ? (
                <button
                  id="nav-owner"
                  onClick={() => setCurrentTab('owner')}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'owner'
                      ? 'bg-[#6B4FA1] text-white shadow-xs'
                      : 'text-[#6B4FA1] hover:bg-[#EDE7F8]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Owner Dashboard</span>
                  {pendingVerificationsCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#B9A7E8] text-[#302A38] animate-pulse">
                      {pendingVerificationsCount}
                    </span>
                  )}
                </button>
              ) : (
                <button
                  id="nav-owner-login"
                  onClick={onOpenOwnerLogin}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6B4FA1] hover:bg-[#EDE7F8] transition"
                  title="Restricted to authorized Business Owners"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#6B4FA1]" />
                  <span>Owner Login</span>
                </button>
              )}
            </nav>

            {/* If Owner logged in, display quick badge & logout */}
            {ownerSession && (
              <div className="hidden sm:flex items-center gap-2 pl-1 border-l border-[#EDE7F8]">
                <div className="text-right">
                  <span className="block text-[11px] font-bold text-[#302A38] leading-none">
                    {ownerSession.name}
                  </span>
                  <span className="text-[10px] text-[#6B4FA1] leading-none">Owner</span>
                </div>
                <button
                  onClick={onOwnerLogout}
                  title="Log out of Owner session"
                  className="p-1.5 text-[#302A38]/60 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* AI Assistant Help Button */}
            <button
              id="nav-ai-assistant-toggle"
              onClick={onToggleAssistant}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isAssistantOpen
                  ? 'bg-[#6B4FA1] text-white border-[#6B4FA1]'
                  : 'bg-white text-[#6B4FA1] border-[#EDE7F8] hover:bg-[#EDE7F8]'
              }`}
              title="Toggle Supporting AI Help Assistant"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#B9A7E8]" />
              <span className="hidden sm:inline">AI Help</span>
            </button>

            {/* Reset Demo DB button */}
            <button
              onClick={onResetDemo}
              title="Reset to fresh CozyCup sample database"
              className="p-1.5 text-[#302A38]/50 hover:text-[#6B4FA1] hover:bg-[#EDE7F8] rounded-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
