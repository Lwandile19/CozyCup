import React, { useState, useEffect, useId } from 'react';
import { Order, FNB_BANKING_DETAILS } from '../types';
import {
  subscribeToOrderById,
  getOrderByIdFromFirestore,
  acceptQuoteInFirestore,
  submitPaymentProofInFirestore,
  cancelOrderInFirestore,
  FIRESTORE_ERROR_MSG
} from '../services/firestoreService';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  Building2,
  Upload,
  ArrowRight,
  Heart,
  XCircle,
  Package,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  Lock,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface OrderTrackerViewProps {
  initialOrderId?: string;
  onNavigateToCatalogue: () => void;
}

export const OrderTrackerView: React.FC<OrderTrackerViewProps> = ({
  initialOrderId = '',
  onNavigateToCatalogue
}) => {
  const [searchId, setSearchId] = useState(initialOrderId);
  const [contactVerification, setContactVerification] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Cancellation State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Quick Payment Proof in Tracker
  const [showPaymentProofForm, setShowPaymentProofForm] = useState(false);
  const [refNumber, setRefNumber] = useState('');
  const [payerName, setPayerName] = useState('');
  const [fileName, setFileName] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const orderIdInputId = useId();
  const contactVerifyInputId = useId();
  const cancelReasonInputId = useId();
  const trackerPayerInputId = useId();
  const trackerRefInputId = useId();

  // Keep verified order updated in real time via Firestore onSnapshot
  useEffect(() => {
    if (!order?.order_id) return;

    const unsubscribe = subscribeToOrderById(order.order_id, (updated) => {
      if (updated) {
        setOrder(updated);
      }
    });

    return () => unsubscribe();
  }, [order?.order_id]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = searchId.trim();
    const cleanContact = contactVerification.trim();

    if (!cleanId) {
      setErrorMsg('Please enter your Order ID.');
      setOrder(null);
      return;
    }
    if (!cleanContact) {
      setErrorMsg('Please enter your email address or phone number for security verification.');
      setOrder(null);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const fetched = await getOrderByIdFromFirestore(cleanId);
      if (!fetched) {
        setOrder(null);
        setErrorMsg('We could not find an order with those details. Please check your Order ID and email/phone.');
        setIsLoading(false);
        return;
      }

      // Verify email or phone against customer record
      const inputContact = cleanContact.toLowerCase();
      const orderEmail = (fetched.customer?.email || '').trim().toLowerCase();
      const orderPhoneDigits = (fetched.customer?.phone_number || '').replace(/\D/g, '');
      const inputPhoneDigits = cleanContact.replace(/\D/g, '');

      const emailMatches = inputContact.includes('@') && orderEmail === inputContact;
      const phoneMatches = inputPhoneDigits.length >= 7 && (orderPhoneDigits.includes(inputPhoneDigits) || inputPhoneDigits.includes(orderPhoneDigits));

      if (!emailMatches && !phoneMatches) {
        setOrder(null);
        setErrorMsg('We could not find an order with those details. Please check your Order ID and email/phone.');
        setIsLoading(false);
        return;
      }

      setOrder(fetched);
      setErrorMsg(null);
    } catch (err) {
      console.error('Order tracking query error:', err);
      setOrder(null);
      setErrorMsg('We could not find an order with those details. Please check your Order ID and email/phone.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleAcceptQuote = async () => {
    if (!order) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const updated = await acceptQuoteInFirestore(order.order_id);
      setOrder(updated);
      setActionSuccessMsg('Quote accepted! Official FNB banking details are ready below.');
    } catch (err: any) {
      setErrorMsg(err.message || FIRESTORE_ERROR_MSG);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelClick = () => {
    if (!order) return;

    const canCancel =
      order.order_status === 'Pending Quote' ||
      order.order_status === 'Quote Sent' ||
      order.order_status === 'Awaiting Payment';

    if (!canCancel) {
      setErrorMsg(
        'This order can no longer be cancelled online because handcrafting has begun or payment has already been verified. Please contact CozyCup directly.'
      );
      return;
    }

    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!order) return;
    setIsCancelling(true);
    setErrorMsg(null);

    try {
      const updated = await cancelOrderInFirestore(order.order_id, cancelReason);
      setOrder(updated);
      setShowCancelModal(false);
      setActionSuccessMsg('Order successfully cancelled. Inventory units updated in database.');
    } catch (err: any) {
      setErrorMsg(err.message || FIRESTORE_ERROR_MSG);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !refNumber.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const updated = await submitPaymentProofInFirestore(order.order_id, {
        reference_number: refNumber.trim(),
        payer_name: payerName.trim() || order.customer.full_name,
        file_name: fileName || 'fnb_proof_of_payment.pdf'
      });
      setOrder(updated);
      setShowPaymentProofForm(false);
      setActionSuccessMsg('Proof of payment submitted! Status updated to Pending Verification.');
    } catch (err: any) {
      setErrorMsg(err.message || FIRESTORE_ERROR_MSG);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-left space-y-6">
      {/* Header Banner */}
      <div className="bg-[#F8F6FC] rounded-3xl p-6 border border-[#EDE7F8] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDE7F8] text-[#6B4FA1] mb-2 border border-[#B9A7E8]/40">
            <RefreshCw className="w-3.5 h-3.5 text-[#6B4FA1]" />
            <span>Real-Time Synchronized Order Tracker</span>
          </div>
          <h1 className="text-2xl font-black text-[#302A38]">Track Your CozyCup Order</h1>
          <p className="text-xs text-[#302A38]/70 mt-1">
            Check real-time crafting status, quotes, and payment verification directly from Firestore.
          </p>
        </div>

        <button
          onClick={onNavigateToCatalogue}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B4FA1] bg-white border border-[#EDE7F8] hover:bg-[#EDE7F8] transition self-start md:self-auto"
        >
          ← Return to Catalogue
        </button>
      </div>

      {/* Search Bar with Security Verification (Requirement 13) */}
      <form
        onSubmit={handleSearchSubmit}
        className="bg-white p-5 rounded-3xl border border-[#EDE7F8] shadow-xs space-y-3"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-[#6B4FA1]">
          <Lock className="w-3.5 h-3.5" />
          <span>Customer POPIA Security Verification</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <label htmlFor={orderIdInputId} className="block text-[11px] font-semibold text-[#302A38] mb-1">
              Order ID *
            </label>
            <input
              id={orderIdInputId}
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value.toUpperCase())}
              placeholder="e.g. ORD-CC-123456"
              className="w-full bg-[#F8F6FC] focus:bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs font-mono text-[#302A38] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-5">
            <label htmlFor={contactVerifyInputId} className="block text-[11px] font-semibold text-[#302A38] mb-1">
              Email or Phone Number * (Security check)
            </label>
            <input
              id={contactVerifyInputId}
              type="text"
              value={contactVerification}
              onChange={(e) => setContactVerification(e.target.value)}
              placeholder="e.g. john@example.com or 0821234567"
              className="w-full bg-[#F8F6FC] focus:bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-9 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Track</span>
            </button>
          </div>
        </div>

        <p className="text-[10px] text-[#302A38]/60">
          💡 For privacy protection, customers may only view orders matching their own Order ID and contact details.
        </p>
      </form>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Order Display (Requirement 13: Order ID, products, quantity, quoted amount, payment status, order status, order date, estimated completion date, last updated) */}
      {order && (
        <div className="space-y-6">
          {/* Main Status Header Card */}
          <div className="bg-white rounded-3xl border border-[#EDE7F8] p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EDE7F8]">
              <div>
                <span className="text-[10px] font-semibold text-[#6B4FA1] uppercase tracking-wider block">
                  Order Details & Real-Time Sync
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <h2 className="text-xl font-black text-[#302A38]">Order #{order.order_id}</h2>
                  <button
                    onClick={() => handleCopy(order.order_id, 'trackerOrderId')}
                    className="p-1 rounded hover:bg-[#EDE7F8] text-[#6B4FA1] transition"
                    title="Copy Order ID"
                  >
                    {copiedField === 'trackerOrderId' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EDE7F8] text-[#6B4FA1] border border-[#B9A7E8]/40">
                  Status: {order.order_status}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    order.payment_status === 'Verified'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : order.payment_status === 'Pending Verification'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-stone-100 text-stone-700 border-stone-200'
                  }`}
                >
                  Payment: {order.payment_status}
                </span>
              </div>
            </div>

            {/* Grid of Key Order Metadata (Requirement 13) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-[#F8F6FC] p-3 rounded-2xl border border-[#EDE7F8]">
                <span className="text-[10px] text-[#302A38]/60 block">Item & Category</span>
                <span className="font-bold text-[#302A38] line-clamp-1">{order.item_requested}</span>
                <span className="text-[11px] text-[#6B4FA1] font-semibold">{order.item_category}</span>
              </div>

              <div className="bg-[#F8F6FC] p-3 rounded-2xl border border-[#EDE7F8]">
                <span className="text-[10px] text-[#302A38]/60 block">Quantity & Colour</span>
                <span className="font-bold text-[#302A38]">{order.quantity} unit{order.quantity > 1 ? 's' : ''}</span>
                <span className="text-[11px] text-[#302A38]/70 block">{order.colour}</span>
              </div>

              <div className="bg-[#F8F6FC] p-3 rounded-2xl border border-[#EDE7F8]">
                <span className="text-[10px] text-[#302A38]/60 block">Quoted Amount</span>
                <span className="font-black text-base text-[#6B4FA1]">R{order.quoted_amount.toFixed(2)}</span>
                <span className="text-[10px] text-[#302A38]/50 block">Includes delivery</span>
              </div>

              <div className="bg-[#F8F6FC] p-3 rounded-2xl border border-[#EDE7F8]">
                <span className="text-[10px] text-[#302A38]/60 block">Estimated Completion</span>
                <span className="font-bold text-[#302A38]">
                  {order.estimated_completion_date
                    ? new Date(order.estimated_completion_date).toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'Pending Schedule'}
                </span>
                <span className="text-[10px] text-[#302A38]/60 line-clamp-1">
                  {order.estimated_completion_note || 'Standard lead time'}
                </span>
              </div>
            </div>

            {/* Timestamps */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-[#302A38]/60 pt-2 border-t border-[#EDE7F8]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#6B4FA1]" />
                Ordered on: {new Date(order.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span>
                Last updated in database: {new Date(order.updated_at || order.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Action Cards depending on order status (FIX 7 Sequence) */}
          
          {/* Step 1: Pending Quote (Awaiting Owner Review) */}
          {order.order_status === 'Pending Quote' && (
            <div className="bg-amber-50/80 border border-amber-200 p-5 rounded-3xl space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-700" />
                <h3 className="font-bold text-amber-950 text-sm">Awaiting Owner Quote & Lead Time</h3>
              </div>
              <p className="text-xs text-amber-900/80 leading-relaxed">
                Thank you! Your order request has been received. CozyCup is reviewing your requested item and material requirements to finalize the quote and estimated completion date. As soon as the owner provides the quote, payment details and EFT instructions will appear here.
              </p>
            </div>
          )}

          {/* Step 2 & 3: Quote Sent (Ready for Customer Review & Acceptance) */}
          {order.order_status === 'Quote Sent' && (
            <div className="bg-white p-5 rounded-3xl border border-[#EDE7F8] shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="font-bold text-[#302A38] text-sm">Quotation Ready for Approval</h3>
                  </div>
                  <p className="text-xs text-[#302A38]/70 mt-1">
                    Quoted Total: <strong className="text-[#6B4FA1]">R{order.quoted_amount.toFixed(2)}</strong> • Estimated Completion: <strong>{order.estimated_completion_date ? new Date(order.estimated_completion_date).toLocaleDateString() : 'To be scheduled'}</strong>
                  </p>
                </div>
                <button
                  onClick={handleAcceptQuote}
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Accept Quote & Proceed to Payment
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Awaiting Payment (FNB EFT Instructions & Proof Submission) */}
          {(order.order_status === 'Awaiting Payment' || (order.order_status === 'Quote Sent' && order.payment_status === 'Unpaid')) && (
            <div className="bg-linear-to-br from-[#0B2545] to-[#133C55] rounded-3xl text-white p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-300" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      CozyCup Official FNB Banking
                    </span>
                    <h4 className="font-black text-lg">FNB EFT Instructions</h4>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-300">Amount Due: R{order.quoted_amount.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
                  <span className="text-white/70 text-[10px] block">Account Holder</span>
                  <span className="font-bold text-sm text-white">{FNB_BANKING_DETAILS.accountName}</span>
                </div>

                <div className="bg-white/10 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-white/70 text-[10px] block">Account Number</span>
                    <span className="font-mono font-bold text-sm text-amber-300">{FNB_BANKING_DETAILS.accountNumber}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(FNB_BANKING_DETAILS.accountNumber, 'accNoTracker')}
                    className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition"
                  >
                    {copiedField === 'accNoTracker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="bg-white/10 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-white/70 text-[10px] block">Branch Code</span>
                    <span className="font-mono font-bold text-sm text-white">{FNB_BANKING_DETAILS.branchCode}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(FNB_BANKING_DETAILS.branchCode, 'branchTracker')}
                    className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition"
                  >
                    {copiedField === 'branchTracker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="bg-white/10 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-white/70 text-[10px] block">CRITICAL Reference</span>
                    <span className="font-mono font-bold text-sm text-amber-300">{order.order_id}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(order.order_id, 'refTracker')}
                    className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition"
                  >
                    {copiedField === 'refTracker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {!showPaymentProofForm ? (
                <button
                  onClick={() => setShowPaymentProofForm(true)}
                  className="w-full py-2.5 bg-white text-[#0B2545] rounded-xl text-xs font-bold transition hover:bg-white/90 flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>I Have Paid — Submit Proof of Payment</span>
                </button>
              ) : (
                <form onSubmit={handleSubmitProof} className="bg-white/10 p-4 rounded-2xl border border-white/15 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={trackerRefInputId} className="text-[10px] text-white/80 block mb-1">
                        Bank Reference *
                      </label>
                      <input
                        id={trackerRefInputId}
                        type="text"
                        value={refNumber}
                        onChange={(e) => setRefNumber(e.target.value)}
                        placeholder={order.order_id}
                        className="w-full bg-white/20 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/50"
                      />
                    </div>
                    <div>
                      <label htmlFor={trackerPayerInputId} className="text-[10px] text-white/80 block mb-1">
                        Payer Name
                      </label>
                      <input
                        id={trackerPayerInputId}
                        type="text"
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                        placeholder={order.customer.full_name}
                        className="w-full bg-white/20 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPaymentProofForm(false)}
                      className="text-xs text-white/70 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 bg-amber-300 text-[#0B2545] rounded-xl text-xs font-bold hover:bg-amber-400 transition"
                    >
                      Confirm Submission
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 3. Pending Verification Notice */}
          {order.payment_status === 'Pending Verification' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-3 text-xs text-amber-800">
              <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900">Payment Proof Received — Awaiting Owner Verification</h4>
                <p className="mt-0.5 text-amber-800/80 leading-relaxed">
                  Thank you! Ms Roseane manually verifies all FNB bank payments. Once verified, this page updates in real-time, the order status changes to "Paid", and the calendar schedule is activated.
                </p>
              </div>
            </div>
          )}

          {/* 4. Verified & Paid Notice */}
          {order.payment_status === 'Verified' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-start gap-3 text-xs text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-emerald-900">Payment Verified & Order Active</h4>
                <p className="mt-0.5 text-emerald-800/80 leading-relaxed">
                  Payment confirmed! Your handcrafted piece is officially in progress. We look forward to delivering your cozy creation.
                </p>
              </div>
            </div>
          )}

          {/* Cancellation Option (Section 8) */}
          {['Pending Quote', 'Quote Sent', 'Awaiting Payment'].includes(order.order_status) && (
            <div className="text-right pt-2">
              <button
                onClick={handleCancelClick}
                className="text-xs text-rose-600 hover:text-rose-700 underline font-medium transition"
              >
                Need to cancel this order?
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#302A38]/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#EDE7F8] space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-[#302A38]">Cancel Order #{order?.order_id}?</h3>
            <p className="text-xs text-[#302A38]/70 leading-relaxed">
              Are you sure you want to cancel? This will update the status to Cancelled in the database and release any reserved inventory units back into stock.
            </p>

            <div>
              <label htmlFor={cancelReasonInputId} className="block text-xs font-semibold text-[#302A38] mb-1">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                id={cancelReasonInputId}
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Changed mind / ordered by mistake"
                className="w-full bg-[#F8F6FC] border border-[#EDE7F8] rounded-xl p-2 text-xs focus:outline-none focus:border-[#6B4FA1]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#302A38]/70"
              >
                Keep Order
              </button>
              <button
                onClick={confirmCancel}
                disabled={isCancelling}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
