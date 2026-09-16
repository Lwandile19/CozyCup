import React, { useState, useId } from 'react';
import { Product, Order } from '../types';
import {
  createOrderInFirestore,
  FIRESTORE_ERROR_MSG
} from '../services/firestoreService';
import {
  X,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
  Clock,
  Copy,
  Check
} from 'lucide-react';

interface QuickOrderModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted: (order: Order) => void;
  onNavigateToTracker?: (orderId: string) => void;
}

export const QuickOrderModal: React.FC<QuickOrderModalProps> = ({
  product,
  isOpen,
  onClose,
  onOrderCompleted,
  onNavigateToTracker
}) => {
  if (!isOpen || !product) return null;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [popiaConsent, setPopiaConsent] = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const nameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const qtyId = useId();
  const consentId = useId();

  const unitPrice = product.price;
  const subtotal = unitPrice * quantity;
  const delivery = subtotal > 200 ? 0 : 35;
  const total = subtotal + delivery;

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const words = fullName.trim().split(/\s+/);
    if (!fullName || words.length < 2) {
      setNameError('Please enter your full name (e.g. Jane Doe).');
      return;
    }
    setNameError(null);

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length !== 10 || !cleanPhone.startsWith('0')) {
      setPhoneError('Please ensure that you have entered your full number (e.g. 0821234567).');
      return;
    }
    setPhoneError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError(null);

    if (!popiaConsent) {
      setConsentError('POPIA consent is required to process your order.');
      return;
    }
    setConsentError(null);

    setIsSubmitting(true);
    try {
      const order = await createOrderInFirestore({
        product_id: product.product_id,
        quantity,
        full_name: fullName.trim(),
        email: email.trim(),
        phone_number: cleanPhone,
        item_category: product.category,
        item_requested: product.product_name,
        colour: (product as any).default_colour || 'Standard In-Stock',
        is_quick_order: true,
        order_type: 'quick',
        popia_consent: true,
        estimated_completion_date: new Date(Date.now() + product.lead_time_days * 86400000).toISOString(),
        estimated_completion_note: `${product.lead_time_days} days quick dispatch`
      });

      setCreatedOrder(order);
      onOrderCompleted(order);
    } catch (err: any) {
      setErrorMsg(err.message || FIRESTORE_ERROR_MSG);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdOrder) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[#302A38]/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#EDE7F8] p-6 text-center space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 mb-1">
              ⚡ Quick Order Created
            </span>
            <h3 className="text-xl font-black text-[#302A38]">Order Placed Successfully!</h3>
            <p className="text-xs text-[#302A38]/70">
              Your quick order has been saved to the database. Use your Order ID to track status anytime.
            </p>
          </div>

          <div className="p-4 bg-[#F8F6FC] rounded-2xl border border-[#EDE7F8] space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#302A38]/60 font-semibold">Your Order ID</span>
              <button
                type="button"
                onClick={() => handleCopy(createdOrder.order_id)}
                className="flex items-center gap-1 text-xs font-bold text-[#6B4FA1] hover:underline cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy ID'}</span>
              </button>
            </div>
            <div className="font-mono text-base font-bold text-[#6B4FA1] bg-white p-2.5 rounded-xl border border-[#EDE7F8] text-center">
              {createdOrder.order_id}
            </div>
            <div className="pt-2 border-t border-[#EDE7F8] flex justify-between text-xs text-[#302A38]">
              <span>{createdOrder.quantity}x {createdOrder.item_requested}</span>
              <span className="font-bold text-[#6B4FA1]">R{createdOrder.quoted_amount.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-3 rounded-xl border border-[#EDE7F8] text-xs font-bold text-[#302A38]/70 hover:bg-[#F8F6FC] transition"
            >
              Back to Catalog
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onNavigateToTracker) onNavigateToTracker(createdOrder.order_id);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-[#6B4FA1] text-white text-xs font-bold hover:bg-[#6B4FA1]/90 transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Track Order</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[#302A38]/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#EDE7F8] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-[#F8F6FC] border-b border-[#EDE7F8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#302A38] text-sm leading-tight">Quick Order</h3>
              <p className="text-[11px] text-[#302A38]/60">Express checkout for in-stock boutique items</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#302A38]/60 hover:text-[#302A38] hover:bg-[#EDE7F8] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleQuickSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Pill */}
          <div className="p-3 bg-[#F8F6FC] rounded-2xl border border-[#EDE7F8] flex items-center justify-between text-xs">
            <div>
              <h4 className="font-bold text-[#302A38]">{product.product_name}</h4>
              <span className="text-[#6B4FA1] font-semibold">{product.category} • R{product.price.toFixed(2)}</span>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
              {product.stock_quantity} In Stock
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor={nameId} className="block text-xs font-medium text-[#302A38] mb-1">
                Full Name *
              </label>
              <input
                id={nameId}
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full bg-[#F8F6FC] focus:bg-white border border-[#EDE7F8] rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none"
              />
              {nameError && <p className="text-[10px] text-rose-600 mt-1">{nameError}</p>}
            </div>

            <div>
              <label htmlFor={phoneId} className="block text-xs font-medium text-[#302A38] mb-1">
                Phone Number *
              </label>
              <input
                id={phoneId}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0821234567"
                className="w-full bg-[#F8F6FC] focus:bg-white border border-[#EDE7F8] rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none"
              />
              {phoneError && <p className="text-[10px] text-rose-600 mt-1">{phoneError}</p>}
            </div>

            <div>
              <label htmlFor={emailId} className="block text-xs font-medium text-[#302A38] mb-1">
                Email Address *
              </label>
              <input
                id={emailId}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full bg-[#F8F6FC] focus:bg-white border border-[#EDE7F8] rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none"
              />
              {emailError && <p className="text-[10px] text-rose-600 mt-1">{emailError}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#EDE7F8]/40 border border-[#B9A7E8]/40 rounded-2xl text-xs">
            <div className="flex items-center gap-2">
              <label htmlFor={qtyId} className="font-semibold text-[#302A38]">Quantity:</label>
              <input
                id={qtyId}
                type="number"
                min="1"
                max={product.stock_quantity || 10}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 text-center bg-white border border-[#EDE7F8] rounded-xl py-1 text-xs font-bold"
              />
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#302A38]/60 block">Total Quoted</span>
              <span className="font-black text-sm text-[#6B4FA1]">R{total.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label htmlFor={consentId} className="flex items-start gap-2 text-xs text-[#302A38]/80 cursor-pointer">
              <input
                id={consentId}
                type="checkbox"
                checked={popiaConsent}
                onChange={(e) => setPopiaConsent(e.target.checked)}
                className="mt-0.5 rounded text-[#6B4FA1]"
              />
              <span>I consent under POPIA to CozyCup processing my information to fulfill this order. *</span>
            </label>
            {consentError && <p className="text-[10px] text-rose-600 mt-1">{consentError}</p>}
          </div>

          <div className="pt-3 border-t border-[#EDE7F8] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#302A38]/60 hover:text-[#302A38]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting ? 'Placing Quick Order...' : 'Confirm Quick Order'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
