import React, { useState, useEffect, useId } from 'react';
import {
  Product,
  Order,
  FNB_BANKING_DETAILS,
  STANDARD_COLOURS
} from '../types';
import {
  createOrderInFirestore,
  acceptQuoteInFirestore,
  submitPaymentProofInFirestore,
  subscribeToOrderById,
  FIRESTORE_ERROR_MSG
} from '../services/firestoreService';
import {
  calculateEstimatedCompletion,
  isSpecialColourRequested
} from '../utils/dateEstimator';
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Building2,
  Upload,
  User,
  Mail,
  Phone,
  Sparkles,
  Heart,
  Lock,
  Calendar,
  Layers,
  Palette,
  Clock,
  ChevronRight,
  ShoppingBag,
  CreditCard,
  CheckCircle,
  FileCheck,
  ArrowLeft
} from 'lucide-react';

interface OrderFormViewProps {
  initialProduct?: Product | null;
  products: Product[];
  onOrderCreated?: (order: Order) => void;
  onNavigateToTracker: (orderId: string) => void;
  onNavigateToCatalogue: () => void;
}

const CATEGORY_OPTIONS = ['Crochet', 'Bracelets', 'Custom Orders'];
const REQUIRED_COLOURS = ['Black', 'White', 'Blue', 'Purple', 'Pink'];

export const OrderFormView: React.FC<OrderFormViewProps> = ({
  initialProduct = null,
  products,
  onOrderCreated,
  onNavigateToTracker,
  onNavigateToCatalogue
}) => {
  // 5 Stages: 'form' | 'review' | 'quote' | 'payment' | 'verification'
  const [stage, setStage] = useState<'form' | 'review' | 'quote' | 'payment' | 'verification'>('form');

  // Matched product state
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProduct?.product_id || ''
  );
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(
    initialProduct || null
  );

  // Field 1: Full Name *
  const [fullName, setFullName] = useState('');
  // Field 2: Phone Number *
  const [phone, setPhone] = useState('');
  // Field 3: Email Address *
  const [email, setEmail] = useState('');
  // Field 4: Item Category *
  const [itemCategory, setItemCategory] = useState<string>(
    initialProduct?.category || 'Crochet'
  );
  // Field 5: Item Requested *
  const [itemRequested, setItemRequested] = useState<string>(
    initialProduct?.product_name || ''
  );
  // Field 6: Colour *
  const [selectedColour, setSelectedColour] = useState<string>('Purple');
  const [customColour, setCustomColour] = useState<string>('');
  const [isCustomColourActive, setIsCustomColourActive] = useState<boolean>(false);
  // Field 7: Quantity *
  const [quantity, setQuantity] = useState<number>(1);
  // Field 8: POPIA Consent *
  const [popiaConsent, setPopiaConsent] = useState<boolean>(false);

  // Validation errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);

  // Created Order & Firestore submission
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Proof of Payment State
  const [referenceNumber, setReferenceNumber] = useState('');
  const [payerName, setPayerName] = useState('');
  const [fileName, setFileName] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fullNameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const categoryId = useId();
  const itemRequestedId = useId();
  const customColourId = useId();
  const quantityId = useId();
  const popiaId = useId();
  const productSelectId = useId();

  // Sync initial product if changed
  useEffect(() => {
    if (initialProduct) {
      setSelectedProductId(initialProduct.product_id);
      setMatchedProduct(initialProduct);
      setItemCategory(initialProduct.category);
      setItemRequested(initialProduct.product_name);
    }
  }, [initialProduct]);

  // Handle dropdown selection of known product
  const handleProductSelectionChange = (prodId: string) => {
    setSelectedProductId(prodId);
    if (!prodId || prodId === 'custom') {
      setMatchedProduct(null);
      return;
    }
    const found = products.find((p) => p.product_id === prodId);
    if (found) {
      setMatchedProduct(found);
      setItemCategory(found.category);
      setItemRequested(found.product_name);
      setItemError(null);
    }
  };

  // Real-time listener for created order
  useEffect(() => {
    if (!createdOrder?.order_id) return;
    const unsub = subscribeToOrderById(createdOrder.order_id, (updated) => {
      if (updated) {
        setCreatedOrder(updated);
      }
    });
    return () => unsub();
  }, [createdOrder?.order_id]);

  // Effective colour
  const effectiveColour = isCustomColourActive
    ? customColour.trim() || 'Custom Colour'
    : selectedColour;

  // Dynamic estimated completion date
  const estCompletion = calculateEstimatedCompletion(
    itemCategory,
    itemRequested,
    effectiveColour,
    new Date(),
    matchedProduct ? matchedProduct.stock_quantity < quantity : true
  );

  // Price calculations
  const unitPrice = matchedProduct ? matchedProduct.price : 85.0;
  const subtotal = unitPrice * quantity;
  const packagingDelivery = subtotal > 200 ? 0 : 35.0;
  const totalEstimatedAmount = subtotal + packagingDelivery;

  // Copy helper
  const handleCopy = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Validation logic
  const validateFullName = (name: string): boolean => {
    const words = name.trim().split(/\s+/);
    if (!name || words.length < 2 || words.some((w) => w.length === 0)) {
      setNameError('Please enter your full name (at least first name and surname).');
      return false;
    }
    setNameError(null);
    return true;
  };

  const validatePhone = (p: string): boolean => {
    const clean = p.trim().replace(/\s+/g, '');
    const isDigits = /^\d+$/.test(clean);
    if (!clean || !isDigits || clean.length !== 10 || !clean.startsWith('0')) {
      setPhoneError('Phone number must start with 0 and be exactly 10 digits (e.g. 0821234567).');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const validateEmail = (e: string): boolean => {
    const clean = e.trim();
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      setEmailError('Please enter a valid email address containing @.');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validateItem = (item: string): boolean => {
    if (!item.trim()) {
      setItemError('Please specify the item requested or description.');
      return false;
    }
    setItemError(null);
    return true;
  };

  const validateConsent = (c: boolean): boolean => {
    if (!c) {
      setConsentError('POPIA consent is required to process your order.');
      return false;
    }
    setConsentError(null);
    return true;
  };

  // Stage 1 -> Stage 2: Review Order
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    const isNameOk = validateFullName(fullName);
    const isPhoneOk = validatePhone(phone);
    const isEmailOk = validateEmail(email);
    const isItemOk = validateItem(itemRequested);
    const isConsentOk = validateConsent(popiaConsent);

    if (!isNameOk || !isPhoneOk || !isEmailOk || !isItemOk || !isConsentOk) {
      return;
    }
    if (quantity < 1) {
      setItemError('Quantity must be at least 1.');
      return;
    }
    setStage('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Stage 2 -> Stage 3: Confirm Order -> Create in Firestore & show Quote
  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const order = await createOrderInFirestore({
        product_id: matchedProduct?.product_id || 'prod-custom',
        quantity,
        full_name: fullName.trim(),
        email: email.trim(),
        phone_number: phone.trim().replace(/\s+/g, ''),
        item_category: itemCategory,
        item_requested: itemRequested.trim(),
        colour: effectiveColour,
        is_special_colour: isSpecialColourRequested(effectiveColour),
        popia_consent: popiaConsent,
        estimated_completion_date: estCompletion.targetDate.toISOString(),
        estimated_completion_note: estCompletion.breakdown
      });

      setCreatedOrder(order);
      if (onOrderCreated) onOrderCreated(order);
      setStage('quote');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stage 3 -> Stage 4: Accept Quote -> Proceed to FNB Payment instructions
  const handleAcceptQuote = async () => {
    if (!createdOrder) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await acceptQuoteInFirestore(createdOrder.order_id);
      setCreatedOrder(updated);
      setStage('payment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stage 4 -> Stage 5: Proceed to Upload Proof of Payment
  const handleProceedToUploadProof = () => {
    if (createdOrder) {
      setReferenceNumber(createdOrder.order_id);
      setPayerName(fullName);
    }
    setStage('verification');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Stage 5: Submit Proof of Payment to Firestore
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdOrder) return;

    if (!referenceNumber.trim()) {
      setSubmitError('Please enter the FNB deposit reference number.');
      return;
    }
    if (!payerName.trim()) {
      setSubmitError('Please enter the name of the bank account holder who paid.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await submitPaymentProofInFirestore(createdOrder.order_id, {
        reference_number: referenceNumber.trim(),
        payer_name: payerName.trim(),
        file_name: fileName.trim() || 'fnb_payment_proof.pdf',
        notes: paymentNotes.trim()
      });

      setCreatedOrder(updated);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <button
            onClick={onNavigateToCatalogue}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B4FA1] hover:text-[#302A38] mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Product Catalogue</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-[#302A38] tracking-tight">
            CozyCup Custom Order
          </h1>
          <p className="text-xs sm:text-sm text-[#302A38]/70 mt-1">
            Handcrafted South African crochet cozies and beaded bracelets with real-time Firestore tracking.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>POPIA Protected</span>
        </div>
      </div>

      {/* 5-Stage Stepper Navigation */}
      <div className="bg-white rounded-2xl border border-[#EDE7F8] p-3 sm:p-4 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[500px]">
          {[
            { id: 'form', step: '1', title: 'Order Details' },
            { id: 'review', step: '2', title: 'Review Order' },
            { id: 'quote', step: '3', title: 'Official Quote' },
            { id: 'payment', step: '4', title: 'FNB Payment' },
            { id: 'verification', step: '5', title: 'Proof & Verify' }
          ].map((s, idx) => {
            const isCurrent = stage === s.id;
            const isCompleted =
              (s.id === 'form' && stage !== 'form') ||
              (s.id === 'review' && ['quote', 'payment', 'verification'].includes(stage)) ||
              (s.id === 'quote' && ['payment', 'verification'].includes(stage)) ||
              (s.id === 'payment' && stage === 'verification');

            return (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-[#6B4FA1] text-white shadow-xs'
                        : 'bg-[#F8F6FC] text-[#302A38]/40 border border-[#EDE7F8]'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.step}
                  </div>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap ${
                      isCurrent ? 'text-[#6B4FA1]' : isCompleted ? 'text-emerald-700' : 'text-[#302A38]/50'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {idx < 4 && <div className="h-0.5 w-6 sm:w-10 bg-[#EDE7F8] shrink-0 mx-2" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Global Error Banner */}
      {submitError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 1: ORDER FORM (FIELDS 1 - 8 IN EXACT ORDER)                         */}
      {/* ========================================================================= */}
      {stage === 'form' && (
        <div className="bg-white rounded-3xl border border-[#EDE7F8] p-6 sm:p-8 shadow-xs space-y-8">
          {/* Optional: Known Product Selector */}
          <div className="p-4 rounded-2xl bg-[#F8F6FC] border border-[#EDE7F8] space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor={productSelectId} className="text-xs font-bold text-[#302A38] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#6B4FA1]" />
                <span>Choose from Product Catalog or create a Custom Order</span>
              </label>
              {matchedProduct && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Linked to Catalog
                </span>
              )}
            </div>

            <select
              id={productSelectId}
              value={selectedProductId}
              onChange={(e) => handleProductSelectionChange(e.target.value)}
              className="w-full bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none"
            >
              <option value="custom">✨ (Custom Bespoke Request / New Design)</option>
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name} — R{p.price.toFixed(2)} ({p.availability_status}, {p.stock_quantity} in stock)
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleProceedToReview} className="space-y-6">
            {/* FIELD 1: Full Name * */}
            <div>
              <label htmlFor={fullNameId} className="block text-xs font-bold text-[#302A38] mb-1">
                1. Full Name *
              </label>
              <input
                id={fullNameId}
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (nameError) validateFullName(e.target.value);
                }}
                placeholder="e.g. Sipho Ndlovu"
                className={`w-full bg-[#F8F6FC] focus:bg-white border rounded-xl px-3.5 py-2.5 text-xs text-[#302A38] focus:outline-none transition ${
                  nameError ? 'border-rose-400 focus:border-rose-500' : 'border-[#EDE7F8] focus:border-[#6B4FA1]'
                }`}
              />
              <p className="text-[11px] text-[#302A38]/50 mt-1">At least two words (first name and surname).</p>
              {nameError && <p className="text-[11px] text-rose-600 mt-0.5">{nameError}</p>}
            </div>

            {/* FIELD 2: Phone Number * */}
            <div>
              <label htmlFor={phoneId} className="block text-xs font-bold text-[#302A38] mb-1">
                2. Phone Number *
              </label>
              <input
                id={phoneId}
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) validatePhone(e.target.value);
                }}
                placeholder="e.g. 0821234567"
                className={`w-full bg-[#F8F6FC] focus:bg-white border rounded-xl px-3.5 py-2.5 text-xs text-[#302A38] focus:outline-none transition ${
                  phoneError ? 'border-rose-400 focus:border-rose-500' : 'border-[#EDE7F8] focus:border-[#6B4FA1]'
                }`}
              />
              <p className="text-[11px] text-[#302A38]/50 mt-1">Must start with 0 and be exactly 10 digits.</p>
              {phoneError && <p className="text-[11px] text-rose-600 mt-0.5">{phoneError}</p>}
            </div>

            {/* FIELD 3: Email Address * */}
            <div>
              <label htmlFor={emailId} className="block text-xs font-bold text-[#302A38] mb-1">
                3. Email Address *
              </label>
              <input
                id={emailId}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) validateEmail(e.target.value);
                }}
                placeholder="e.g. customer@example.co.za"
                className={`w-full bg-[#F8F6FC] focus:bg-white border rounded-xl px-3.5 py-2.5 text-xs text-[#302A38] focus:outline-none transition ${
                  emailError ? 'border-rose-400 focus:border-rose-500' : 'border-[#EDE7F8] focus:border-[#6B4FA1]'
                }`}
              />
              <p className="text-[11px] text-[#302A38]/50 mt-1">Must contain @ and valid domain for quote dispatch.</p>
              {emailError && <p className="text-[11px] text-rose-600 mt-0.5">{emailError}</p>}
            </div>

            {/* FIELD 4: Item Category * */}
            <div>
              <label htmlFor={categoryId} className="block text-xs font-bold text-[#302A38] mb-1">
                4. Item Category *
              </label>
              <select
                id={categoryId}
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                className="w-full bg-[#F8F6FC] focus:bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3.5 py-2.5 text-xs text-[#302A38] focus:outline-none"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* FIELD 5: Item Requested * */}
            <div>
              <label htmlFor={itemRequestedId} className="block text-xs font-bold text-[#302A38] mb-1">
                5. Item Requested *
              </label>
              <input
                id={itemRequestedId}
                type="text"
                value={itemRequested}
                onChange={(e) => {
                  setItemRequested(e.target.value);
                  if (itemError) validateItem(e.target.value);
                }}
                placeholder="e.g. Crochet teddy bear, beaded bracelet"
                className={`w-full bg-[#F8F6FC] focus:bg-white border rounded-xl px-3.5 py-2.5 text-xs text-[#302A38] focus:outline-none transition ${
                  itemError ? 'border-rose-400 focus:border-rose-500' : 'border-[#EDE7F8] focus:border-[#6B4FA1]'
                }`}
              />
              {itemError && <p className="text-[11px] text-rose-600 mt-0.5">{itemError}</p>}
            </div>

            {/* FIELD 6: Colour * */}
            <div>
              <label className="block text-xs font-bold text-[#302A38] mb-2">
                6. Colour *
              </label>
              <div className="flex flex-wrap gap-2">
                {REQUIRED_COLOURS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => {
                      setSelectedColour(col);
                      setIsCustomColourActive(false);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition border ${
                      !isCustomColourActive && selectedColour === col
                        ? 'bg-[#6B4FA1] text-white border-[#6B4FA1] shadow-xs'
                        : 'bg-[#F8F6FC] text-[#302A38] border-[#EDE7F8] hover:bg-[#EDE7F8]'
                    }`}
                  >
                    {col}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsCustomColourActive(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
                    isCustomColourActive
                      ? 'bg-[#6B4FA1] text-white border-[#6B4FA1] shadow-xs'
                      : 'bg-[#F8F6FC] text-[#302A38] border-[#EDE7F8] hover:bg-[#EDE7F8]'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Custom Colour</span>
                </button>
              </div>

              {isCustomColourActive && (
                <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5">
                  <label htmlFor={customColourId} className="block text-[11px] font-bold text-amber-900">
                    Specify your custom shade or combination:
                  </label>
                  <input
                    id={customColourId}
                    type="text"
                    value={customColour}
                    onChange={(e) => setCustomColour(e.target.value)}
                    placeholder="e.g. Sage Green, Terracotta & Gold"
                    className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-[#302A38] focus:outline-none"
                  />
                  <p className="text-[10px] text-amber-800">
                    * Note: Custom and special colours include a +4 business days buffer for yarn/bead sourcing.
                  </p>
                </div>
              )}
            </div>

            {/* FIELD 7: Quantity * */}
            <div>
              <label htmlFor={quantityId} className="block text-xs font-bold text-[#302A38] mb-1">
                7. Quantity *
              </label>
              <div className="flex items-center gap-3">
                <input
                  id={quantityId}
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-28 bg-[#F8F6FC] focus:bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3.5 py-2 text-xs font-bold text-[#302A38] focus:outline-none"
                />
                <span className="text-xs text-[#302A38]/60">units</span>
              </div>
            </div>

            {/* Live Pricing & Completion Date Display */}
            <div className="p-4 rounded-2xl bg-[#EDE7F8]/50 border border-[#EDE7F8] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[#302A38]/70 block font-medium">Database Verified Price:</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-semibold text-[#6B4FA1]">R</span>
                  <span className="text-xl font-black text-[#302A38]">
                    {totalEstimatedAmount.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-[#302A38]/60 ml-1">
                    (R{unitPrice.toFixed(2)} x {quantity}{packagingDelivery > 0 ? ' + R35 pkg' : ''})
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[#302A38]/70 block font-medium">Estimated Completion Date:</span>
                <div className="flex items-center gap-1.5 font-bold text-[#6B4FA1]">
                  <Calendar className="w-4 h-4 text-[#6B4FA1]" />
                  <span>
                    {estCompletion.targetDate.toLocaleDateString('en-ZA', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <p className="text-[10px] text-[#302A38]/60">{estCompletion.breakdown}</p>
              </div>
            </div>

            {/* FIELD 8: POPIA Consent Checkbox */}
            <div className="p-4 rounded-2xl bg-[#F8F6FC] border border-[#EDE7F8] space-y-2">
              <label htmlFor={popiaId} className="flex items-start gap-3 cursor-pointer">
                <input
                  id={popiaId}
                  type="checkbox"
                  checked={popiaConsent}
                  onChange={(e) => {
                    setPopiaConsent(e.target.checked);
                    if (consentError) validateConsent(e.target.checked);
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-[#6B4FA1] focus:ring-[#6B4FA1]"
                />
                <span className="text-xs text-[#302A38]/80 leading-relaxed">
                  <strong>POPIA Consent:</strong> I hereby consent to CozyCup processing my personal details (full name, email address, contact phone number) solely for the fulfillment, payment verification, and communication regarding this handmade order in accordance with the Protection of Personal Information Act (POPIA).
                </span>
              </label>
              {consentError && <p className="text-[11px] text-rose-600">{consentError}</p>}
            </div>

            {/* Submit Button to Stage 2 */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2"
              >
                <span>Review Order</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: REVIEW ORDER                                                     */}
      {/* ========================================================================= */}
      {stage === 'review' && (
        <div className="bg-white rounded-3xl border border-[#EDE7F8] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-[#EDE7F8] pb-4">
            <h2 className="text-lg font-bold text-[#302A38]">Review Your Order Details</h2>
            <p className="text-xs text-[#302A38]/70 mt-0.5">
              Please inspect your order summary before creating your quote.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#F8F6FC] border border-[#EDE7F8] space-y-2">
              <span className="font-bold text-[#6B4FA1] uppercase tracking-wider text-[10px] block">
                Customer Information
              </span>
              <div>
                <span className="text-[#302A38]/60 block">Full Name</span>
                <span className="font-semibold text-[#302A38]">{fullName}</span>
              </div>
              <div>
                <span className="text-[#302A38]/60 block">Contact Phone</span>
                <span className="font-semibold text-[#302A38]">{phone}</span>
              </div>
              <div>
                <span className="text-[#302A38]/60 block">Email Address</span>
                <span className="font-semibold text-[#302A38]">{email}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8F6FC] border border-[#EDE7F8] space-y-2">
              <span className="font-bold text-[#6B4FA1] uppercase tracking-wider text-[10px] block">
                Order Specifications
              </span>
              <div>
                <span className="text-[#302A38]/60 block">Category & Item</span>
                <span className="font-semibold text-[#302A38]">{itemCategory} — {itemRequested}</span>
              </div>
              <div>
                <span className="text-[#302A38]/60 block">Colour Selection</span>
                <span className="font-semibold text-[#302A38]">{effectiveColour}</span>
              </div>
              <div>
                <span className="text-[#302A38]/60 block">Quantity</span>
                <span className="font-semibold text-[#302A38]">{quantity} units</span>
              </div>
            </div>
          </div>

          {/* Pricing & Completion Breakdown */}
          <div className="p-5 rounded-2xl bg-[#EDE7F8]/50 border border-[#EDE7F8] space-y-3 text-xs">
            <div className="flex justify-between items-center text-[#302A38]/80">
              <span>Item Subtotal ({quantity} x R{unitPrice.toFixed(2)})</span>
              <span className="font-semibold text-[#302A38]">R{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-[#302A38]/80">
              <span>Packaging & Courier Buffer</span>
              <span className="font-semibold text-[#302A38]">
                {packagingDelivery === 0 ? 'FREE (Orders > R200)' : `R${packagingDelivery.toFixed(2)}`}
              </span>
            </div>
            <div className="pt-2 border-t border-[#EDE7F8] flex justify-between items-center text-sm font-bold text-[#302A38]">
              <span>Total Estimated Amount</span>
              <span className="text-base text-[#6B4FA1]">R{totalEstimatedAmount.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-[#EDE7F8] text-[11px] text-[#302A38]/70 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#6B4FA1]" />
              <span>Target Completion: {estCompletion.targetDate.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStage('form')}
              className="px-4 py-2.5 rounded-xl border border-[#EDE7F8] text-xs font-semibold text-[#302A38] hover:bg-[#F8F6FC] transition"
            >
              Edit Details
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmOrder}
              className="px-6 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Generating Quote in Firestore...</span>
              ) : (
                <>
                  <span>Confirm Order & Get Quote</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: OFFICIAL QUOTE                                                   */}
      {/* ========================================================================= */}
      {stage === 'quote' && createdOrder && (
        <div className="bg-white rounded-3xl border border-[#EDE7F8] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-start justify-between gap-3 border-b border-[#EDE7F8] pb-4">
            <div>
              <span className="text-[10px] font-black tracking-wider uppercase text-[#6B4FA1] bg-[#EDE7F8] px-2.5 py-1 rounded-full">
                Quote Generated
              </span>
              <h2 className="text-xl font-black text-[#302A38] mt-2">
                CozyCup Official Quote
              </h2>
              <p className="text-xs text-[#302A38]/70">
                Order ID: <strong className="font-mono text-[#6B4FA1]">{createdOrder.order_id}</strong>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#302A38]/60 block">Quoted Amount</span>
              <span className="text-2xl font-black text-[#6B4FA1]">
                R{createdOrder.quoted_amount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F6FC] border border-[#EDE7F8] space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-[#EDE7F8]/80">
              <span className="text-[#302A38]/70">Item Description</span>
              <span className="font-semibold text-[#302A38]">{createdOrder.item_requested} ({createdOrder.colour})</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#EDE7F8]/80">
              <span className="text-[#302A38]/70">Quantity</span>
              <span className="font-semibold text-[#302A38]">{createdOrder.quantity} units</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#EDE7F8]/80">
              <span className="text-[#302A38]/70">Estimated Ready Date</span>
              <span className="font-semibold text-emerald-700">
                {new Date(createdOrder.estimated_completion_date).toLocaleDateString('en-ZA', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[#302A38]/70">Order Status</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                {createdOrder.order_status}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onNavigateToCatalogue}
              className="text-xs font-semibold text-[#302A38]/70 hover:text-[#302A38]"
            >
              Cancel & Exit
            </button>
            <button
              disabled={isSubmitting}
              onClick={handleAcceptQuote}
              className="px-6 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Accepting Quote...</span>
              ) : (
                <>
                  <span>Accept Quote & View FNB Details</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: FNB PAYMENT INSTRUCTIONS                                         */}
      {/* ========================================================================= */}
      {stage === 'payment' && createdOrder && (
        <div className="bg-white rounded-3xl border border-[#EDE7F8] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-[#EDE7F8] pb-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B4FA1] uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-[#6B4FA1]" />
              <span>Direct Bank Transfer</span>
            </div>
            <h2 className="text-xl font-black text-[#302A38] mt-1">
              Official FNB Banking Details
            </h2>
            <p className="text-xs text-[#302A38]/70 mt-0.5">
              Please transfer the quoted amount of{' '}
              <strong className="text-[#6B4FA1]">R{createdOrder.quoted_amount.toFixed(2)}</strong> using your Order ID as the deposit reference.
            </p>
          </div>

          {/* Banking Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-[#F8F6FC] rounded-2xl border border-[#EDE7F8] flex items-center justify-between">
              <div>
                <span className="text-[#302A38]/60 text-[11px] block">Bank Name</span>
                <span className="font-bold text-[#302A38]">{FNB_BANKING_DETAILS.bankName}</span>
              </div>
              <button
                onClick={() => handleCopy(FNB_BANKING_DETAILS.bankName, 'bank')}
                className="p-1.5 hover:bg-white rounded-lg text-[#6B4FA1] transition cursor-pointer"
                title="Copy Bank Name"
              >
                {copiedField === 'bank' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="p-3.5 bg-[#F8F6FC] rounded-2xl border border-[#EDE7F8] flex items-center justify-between">
              <div>
                <span className="text-[#302A38]/60 text-[11px] block">Account Holder</span>
                <span className="font-bold text-[#302A38]">{FNB_BANKING_DETAILS.accountName}</span>
              </div>
              <button
                onClick={() => handleCopy(FNB_BANKING_DETAILS.accountName, 'holder')}
                className="p-1.5 hover:bg-white rounded-lg text-[#6B4FA1] transition cursor-pointer"
                title="Copy Account Holder"
              >
                {copiedField === 'holder' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="p-3.5 bg-[#F8F6FC] rounded-2xl border border-[#EDE7F8] flex items-center justify-between">
              <div>
                <span className="text-[#302A38]/60 text-[11px] block">Account Number</span>
                <span className="font-mono font-bold text-[#302A38]">{FNB_BANKING_DETAILS.accountNumber}</span>
              </div>
              <button
                onClick={() => handleCopy(FNB_BANKING_DETAILS.accountNumber, 'acc')}
                className="p-1.5 hover:bg-white rounded-lg text-[#6B4FA1] transition cursor-pointer"
                title="Copy Account Number"
              >
                {copiedField === 'acc' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="p-3.5 bg-[#F8F6FC] rounded-2xl border border-[#EDE7F8] flex items-center justify-between">
              <div>
                <span className="text-[#302A38]/60 text-[11px] block">Branch Code</span>
                <span className="font-mono font-bold text-[#302A38]">{FNB_BANKING_DETAILS.branchCode}</span>
              </div>
              <button
                onClick={() => handleCopy(FNB_BANKING_DETAILS.branchCode, 'branch')}
                className="p-1.5 hover:bg-white rounded-lg text-[#6B4FA1] transition cursor-pointer"
                title="Copy Branch Code"
              >
                {copiedField === 'branch' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="sm:col-span-2 p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-amber-800 text-[11px] block font-bold">Mandatory Payment Reference:</span>
                <span className="font-mono font-black text-amber-950 text-sm">{createdOrder.order_id}</span>
              </div>
              <button
                onClick={() => handleCopy(createdOrder.order_id, 'ref')}
                className="px-3 py-1.5 bg-white text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                {copiedField === 'ref' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Ref</span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleProceedToUploadProof}
              className="px-6 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2"
            >
              <span>I Have Made Payment — Upload Proof</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 5: UPLOAD PROOF OF PAYMENT & VERIFICATION                           */}
      {/* ========================================================================= */}
      {stage === 'verification' && createdOrder && (
        <div className="bg-white rounded-3xl border border-[#EDE7F8] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-[#EDE7F8] pb-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B4FA1] uppercase tracking-wider">
              <Upload className="w-4 h-4 text-[#6B4FA1]" />
              <span>Step 5: Proof Submission</span>
            </div>
            <h2 className="text-xl font-black text-[#302A38] mt-1">
              Upload Proof of Payment
            </h2>
            <p className="text-xs text-[#302A38]/70 mt-0.5">
              Submit your payment proof to transition your order to Pending Verification in Firestore.
            </p>
          </div>

          {createdOrder.payment_status === 'Pending Verification' ? (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-emerald-950">
                  Payment Proof Submitted Successfully!
                </h3>
                <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
                  Your payment proof has been saved to the database. The CozyCup owner will review and verify your deposit.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs font-mono text-[#302A38] max-w-sm mx-auto">
                <div>Order ID: <strong>{createdOrder.order_id}</strong></div>
                <div>Status: <span className="font-bold text-amber-700">Pending Verification</span></div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => onNavigateToTracker(createdOrder.order_id)}
                  className="px-5 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4" />
                  <span>Track This Order</span>
                </button>
                <button
                  onClick={onNavigateToCatalogue}
                  className="px-4 py-2.5 bg-white border border-[#EDE7F8] hover:bg-[#F8F6FC] text-[#302A38] text-xs font-semibold rounded-xl transition"
                >
                  Back to Catalogue
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitProof} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#302A38] mb-1">
                  Deposit Reference Used on Bank Transfer *
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. ORD-CC-1001"
                  className="w-full bg-[#F8F6FC] focus:bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3.5 py-2 text-xs font-mono text-[#302A38] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#302A38] mb-1">
                  Payer Name / Bank Account Name *
                </label>
                <input
                  type="text"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="e.g. S Ndlovu"
                  className="w-full bg-[#F8F6FC] focus:bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3.5 py-2 text-xs text-[#302A38] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#302A38] mb-1">
                  Proof of Payment File / Screenshot
                </label>
                <div className="border-2 border-dashed border-[#EDE7F8] hover:border-[#6B4FA1] rounded-2xl p-6 text-center bg-[#F8F6FC] transition cursor-pointer">
                  <Upload className="w-6 h-6 text-[#6B4FA1] mx-auto mb-2 opacity-70" />
                  <p className="text-xs font-semibold text-[#302A38]">
                    {fileName || 'Click to select or drag PDF receipt / screenshot'}
                  </p>
                  <p className="text-[10px] text-[#302A38]/50 mt-1">PDF, PNG, JPEG up to 10MB</p>
                  <input
                    type="file"
                    className="hidden"
                    id="pop-upload"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFileName(e.target.files[0].name);
                      }
                    }}
                  />
                  <label
                    htmlFor="pop-upload"
                    className="mt-3 inline-block px-3 py-1.5 bg-white border border-[#EDE7F8] text-xs font-bold text-[#6B4FA1] rounded-xl cursor-pointer hover:bg-[#EDE7F8] transition"
                  >
                    Browse File
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#302A38] mb-1">
                  Payment Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Additional transfer remarks..."
                  className="w-full bg-[#F8F6FC] focus:bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl p-3 text-xs text-[#302A38] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Saving Payment to Firestore...</span>
                  ) : (
                    <>
                      <span>Submit Proof of Payment</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
