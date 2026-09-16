import React, { useState, useEffect, useId } from 'react';
import {
  Product,
  Order,
  Quote,
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
  X,
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
  FileCheck,
  CreditCard,
  CheckCircle
} from 'lucide-react';

interface OrderFormModalProps {
  isOpen: boolean;
  initialProduct?: Product | null;
  products: Product[];
  onClose: () => void;
  onOrderCreated?: (order: Order) => void;
  onNavigateToTracker: (orderId: string) => void;
  onNavigateToOwner?: () => void;
}

const CATEGORY_OPTIONS = ['Crochet', 'Bracelets', 'Custom Orders'];

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  initialProduct = null,
  products,
  onClose,
  onOrderCreated,
  onNavigateToTracker
}) => {
  if (!isOpen) return null;

  // 5 Mandatory Steps: Order Form -> Review -> Quote -> FNB Pay -> Verification
  const [stage, setStage] = useState<
    'form' | 'review' | 'quote' | 'payment' | 'verification'
  >('form');

  // Product Auto-population state
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProduct?.product_id || ''
  );
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(
    initialProduct || null
  );

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [itemCategory, setItemCategory] = useState<string>(
    initialProduct?.category || 'Crochet'
  );
  const [itemRequested, setItemRequested] = useState<string>(
    initialProduct?.product_name || ''
  );
  const [selectedColour, setSelectedColour] = useState<string>('Purple');
  const [customColour, setCustomColour] = useState<string>('');
  const [isCustomColourActive, setIsCustomColourActive] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [popiaConsent, setPopiaConsent] = useState<boolean>(false);

  // Validation Error States
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);

  // Created Order & Live Real-Time Firestore Sync
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Proof of Payment State
  const [referenceNumber, setReferenceNumber] = useState('');
  const [payerName, setPayerName] = useState('');
  const [fileName, setFileName] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fullNameInputId = useId();
  const phoneInputId = useId();
  const emailInputId = useId();
  const productSelectId = useId();
  const itemCategorySelectId = useId();
  const itemRequestedInputId = useId();
  const customColourInputId = useId();
  const popiaCheckboxId = useId();
  const quantityInputId = useId();
  const referenceInputId = useId();
  const payerNameInputId = useId();
  const notesInputId = useId();

  // Handle initial product population when modal opens
  useEffect(() => {
    if (initialProduct) {
      setSelectedProductId(initialProduct.product_id);
      setMatchedProduct(initialProduct);
      setItemCategory(initialProduct.category);
      setItemRequested(initialProduct.product_name);
    }
  }, [initialProduct]);

  // When selectedProductId changes from dropdown, auto-populate category, name, price, stock
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

  // Real-time listener for the created order while on Quote, FNB Pay, or Verification screens
  useEffect(() => {
    if (!createdOrder?.order_id) return;

    const unsubscribe = subscribeToOrderById(createdOrder.order_id, (updatedOrder) => {
      if (updatedOrder) {
        setCreatedOrder(updatedOrder);

        // Auto transition if owner verified payment while on verification screen
        if (updatedOrder.payment_status === 'Verified' && stage === 'verification') {
          // Status updated live!
        }
      }
    });

    return () => unsubscribe();
  }, [createdOrder?.order_id, stage]);

  // Effective colour
  const effectiveColour = isCustomColourActive
    ? customColour.trim() || 'Custom'
    : selectedColour;

  // Dynamic live estimated completion date
  const estCompletion = calculateEstimatedCompletion(
    itemCategory,
    itemRequested,
    effectiveColour,
    new Date(),
    matchedProduct ? matchedProduct.stock_quantity < quantity : true
  );

  // Price calculation
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

  // Validation functions
  const validateFullName = (name: string): boolean => {
    const words = name.trim().split(/\s+/);
    if (!name || words.length < 2 || words.some((w) => w.length === 0)) {
      setNameError('Please enter your full name (e.g. John Smith).');
      return false;
    }
    setNameError(null);
    return true;
  };

  const validatePhone = (p: string): boolean => {
    const clean = p.trim().replace(/\s+/g, '');
    const isDigits = /^\d+$/.test(clean);
    if (!clean || !isDigits || clean.length !== 10 || !clean.startsWith('0')) {
      setPhoneError('Please ensure that you have entered your full number (e.g. 0821234567).');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const validateEmail = (e: string): boolean => {
    const clean = e.trim();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!clean || !regex.test(clean)) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validateItem = (item: string): boolean => {
    if (!item.trim()) {
      setItemError('Please specify the item requested or custom description.');
      return false;
    }
    setItemError(null);
    return true;
  };

  const validateConsent = (c: boolean): boolean => {
    if (!c) {
      setConsentError('Please confirm consent under POPIA to process your order.');
      return false;
    }
    setConsentError(null);
    return true;
  };

  // Step 1 -> Step 2: Order Form -> Review
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

    if (quantity <= 0) {
      setItemError('Quantity must be at least 1.');
      return;
    }

    setStage('review');
  };

  // Step 2 -> Step 3: Review -> Submit Order & Create Quote
  const handleSubmitOrderToFirestore = async () => {
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
    } catch (err: any) {
      setSubmitError(err.message || FIRESTORE_ERROR_MSG);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3 -> Step 4: Accept Quote -> FNB Pay
  const handleAcceptQuoteAndPay = async () => {
    if (!createdOrder) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const updated = await acceptQuoteInFirestore(createdOrder.order_id);
      setCreatedOrder(updated);
      setReferenceNumber(updated.order_id);
      setPayerName(fullName);
      setStage('payment');
    } catch (err: any) {
      setSubmitError(err.message || FIRESTORE_ERROR_MSG);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 4 -> Step 5: FNB Pay -> Submit Proof -> Verification
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdOrder) return;

    if (!referenceNumber.trim()) {
      setSubmitError('Payment reference number is required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const updated = await submitPaymentProofInFirestore(createdOrder.order_id, {
        reference_number: referenceNumber.trim(),
        payer_name: payerName.trim() || fullName,
        file_name: fileName || 'fnb_payment_receipt.pdf',
        notes: paymentNotes.trim()
      });

      setCreatedOrder(updated);
      setStage('verification');
    } catch (err: any) {
      setSubmitError(err.message || FIRESTORE_ERROR_MSG);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Workflow Breadcrumbs Header
  const steps = [
    { key: 'form', label: '1. Order Form' },
    { key: 'review', label: '2. Review' },
    { key: 'quote', label: '3. Quote' },
    { key: 'payment', label: '4. FNB Pay' },
    { key: 'verification', label: '5. Verification' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#302A38]/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-[#EDE7F8] overflow-hidden flex flex-col my-6 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-[#F8F6FC] border-b border-[#EDE7F8] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EDE7F8] text-[#6B4FA1] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-[#302A38] text-base leading-tight">
                CozyCup Custom Order Workflow
              </h2>
              <p className="text-[11px] text-[#302A38]/60">
                Bespoke Handcrafted Keepsakes • Direct FNB EFT
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#302A38]/60 hover:text-[#302A38] hover:bg-[#EDE7F8] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-step progress bar */}
        <div className="bg-white px-6 py-3 border-b border-[#EDE7F8] flex items-center justify-between overflow-x-auto gap-2">
          {steps.map((s, idx) => {
            const isCurrent = stage === s.key;
            const isPast =
              (s.key === 'form' && stage !== 'form') ||
              (s.key === 'review' && ['quote', 'payment', 'verification'].includes(stage)) ||
              (s.key === 'quote' && ['payment', 'verification'].includes(stage)) ||
              (s.key === 'payment' && stage === 'verification');

            return (
              <div key={s.key} className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full transition ${
                    isCurrent
                      ? 'bg-[#6B4FA1] text-white shadow-xs'
                      : isPast
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-[#F8F6FC] text-[#302A38]/50'
                  }`}
                >
                  {isPast ? `✓ ${s.label.split('. ')[1]}` : s.label}
                </span>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-[#302A38]/30 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Scrollable Stage Content */}
        <div className="overflow-y-auto p-6 flex-1 space-y-6">
          {submitError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{submitError}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* STAGE 1: ORDER FORM */}
          {/* ================================================================= */}
          {stage === 'form' && (
            <form onSubmit={handleProceedToReview} className="space-y-6">
              {/* Product auto-population selection */}
              <div className="p-4 rounded-2xl bg-[#F8F6FC] border border-[#EDE7F8] space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor={productSelectId} className="text-xs font-bold text-[#302A38] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#6B4FA1]" />
                    <span>Select Known Product or Custom Design</span>
                  </label>
                  {matchedProduct && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Auto-Populated from Database
                    </span>
                  )}
                </div>

                <select
                  id={productSelectId}
                  value={selectedProductId}
                  onChange={(e) => handleProductSelectionChange(e.target.value)}
                  className="w-full bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none focus:ring-2 focus:ring-[#B9A7E8]/30"
                >
                  <option value="custom">✨ (Custom Bespoke Request / New Design)</option>
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_name} — R{p.price.toFixed(2)} ({p.availability_status})
                    </option>
                  ))}
                </select>

                {matchedProduct && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#EDE7F8]/80 text-[11px]">
                    <div>
                      <span className="text-[#302A38]/60 block">Category</span>
                      <span className="font-semibold text-[#6B4FA1]">{matchedProduct.category}</span>
                    </div>
                    <div>
                      <span className="text-[#302A38]/60 block">DB Price</span>
                      <span className="font-bold text-[#302A38]">R{matchedProduct.price.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[#302A38]/60 block">Availability</span>
                      <span className="font-semibold text-[#302A38]">
                        {matchedProduct.availability_status} ({matchedProduct.stock_quantity} left)
                      </span>
                    </div>
                    <div>
                      <span className="text-[#302A38]/60 block">Lead Time</span>
                      <span className="font-semibold text-[#302A38]">{matchedProduct.lead_time_days} days</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Contact Details */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B4FA1] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Customer Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor={fullNameInputId} className="block text-xs font-medium text-[#302A38] mb-1">
                      Full Name *
                    </label>
                    <input
                      id={fullNameInputId}
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (nameError) validateFullName(e.target.value);
                      }}
                      placeholder="e.g. John Smith"
                      className={`w-full bg-[#F8F6FC] focus:bg-white border rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none transition ${
                        nameError ? 'border-rose-400 focus:border-rose-500' : 'border-[#EDE7F8] focus:border-[#6B4FA1]'
                      }`}
                    />
                    {nameError && <p className="text-[10px] text-rose-600 mt-1">{nameError}</p>}
                  </div>

                  <div>
                    <label htmlFor={phoneInputId} className="block text-xs font-medium text-[#302A38] mb-1">
                      Phone Number *
                    </label>
                    <input
                      id={phoneInputId}
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (phoneError) validatePhone(e.target.value);
                      }}
                      placeholder="0821234567"
                      className={`w-full bg-[#F8F6FC] focus:bg-white border rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none transition ${
                        phoneError ? 'border-rose-400 focus:border-rose-500' : 'border-[#EDE7F8] focus:border-[#6B4FA1]'
                      }`}
                    />
                    {phoneError && <p className="text-[10px] text-rose-600 mt-1">{phoneError}</p>}
                  </div>

                  <div>
                    <label htmlFor={emailInputId} className="block text-xs font-medium text-[#302A38] mb-1">
                      Email Address *
                    </label>
                    <input
                      id={emailInputId}
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) validateEmail(e.target.value);
                      }}
                      placeholder="john@example.com"
                      className={`w-full bg-[#F8F6FC] focus:bg-white border rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none transition ${
                        emailError ? 'border-rose-400 focus:border-rose-500' : 'border-[#EDE7F8] focus:border-[#6B4FA1]'
                      }`}
                    />
                    {emailError && <p className="text-[10px] text-rose-600 mt-1">{emailError}</p>}
                  </div>
                </div>
              </div>

              {/* Item Details */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B4FA1] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Order Specifications
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={itemCategorySelectId} className="block text-xs font-medium text-[#302A38] mb-1">
                      Item Category *
                    </label>
                    <select
                      id={itemCategorySelectId}
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                      className="w-full bg-[#F8F6FC] focus:bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none transition"
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor={itemRequestedInputId} className="block text-xs font-medium text-[#302A38] mb-1">
                      Item Requested *
                    </label>
                    <input
                      id={itemRequestedInputId}
                      type="text"
                      value={itemRequested}
                      onChange={(e) => {
                        setItemRequested(e.target.value);
                        if (itemError) validateItem(e.target.value);
                      }}
                      placeholder="e.g. Classic Mug Cozy with button"
                      className={`w-full bg-[#F8F6FC] focus:bg-white border rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none transition ${
                        itemError ? 'border-rose-400 focus:border-rose-500' : 'border-[#EDE7F8] focus:border-[#6B4FA1]'
                      }`}
                    />
                    {itemError && <p className="text-[10px] text-rose-600 mt-1">{itemError}</p>}
                  </div>
                </div>

                {/* Colour selection pill buttons */}
                <div>
                  <label className="block text-xs font-medium text-[#302A38] mb-2 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#6B4FA1]" />
                    <span>Colour * (Select shade or custom)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {STANDARD_COLOURS.map((col) => {
                      const isSelected = !isCustomColourActive && selectedColour === col;
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => {
                            setSelectedColour(col);
                            setIsCustomColourActive(false);
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
                            isSelected
                              ? 'bg-[#6B4FA1] text-white border-[#6B4FA1] shadow-xs'
                              : 'bg-[#F8F6FC] text-[#302A38] border-[#EDE7F8] hover:border-[#B9A7E8]'
                          }`}
                        >
                          {col}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setIsCustomColourActive(true)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
                        isCustomColourActive
                          ? 'bg-[#6B4FA1] text-white border-[#6B4FA1] shadow-xs'
                          : 'bg-[#F8F6FC] text-[#302A38] border-[#EDE7F8] hover:border-[#B9A7E8]'
                      }`}
                    >
                      Custom Colour
                    </button>
                  </div>

                  {isCustomColourActive && (
                    <div className="mt-2.5">
                      <label htmlFor={customColourInputId} className="block text-[11px] text-[#302A38]/70 mb-1">
                        Specify custom shade (e.g. Sage Green, Terracotta, Coral)
                      </label>
                      <input
                        id={customColourInputId}
                        type="text"
                        value={customColour}
                        onChange={(e) => setCustomColour(e.target.value)}
                        placeholder="Enter custom colour name..."
                        className="w-full bg-[#F8F6FC] focus:bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-1.5 text-xs text-[#302A38] focus:outline-none"
                      />
                      <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Special yarn sourcing: +2-3 days crafted lead time.
                      </p>
                    </div>
                  )}
                </div>

                {/* Quantity and Live Database Pricing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label htmlFor={quantityInputId} className="block text-xs font-medium text-[#302A38] mb-1">
                      Quantity *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-8 h-8 rounded-xl bg-[#F8F6FC] border border-[#EDE7F8] hover:bg-[#EDE7F8] text-sm font-bold flex items-center justify-center transition"
                      >
                        -
                      </button>
                      <input
                        id={quantityInputId}
                        type="number"
                        min="1"
                        max="50"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 text-center bg-[#F8F6FC] border border-[#EDE7F8] rounded-xl py-1.5 text-xs font-bold text-[#302A38]"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="w-8 h-8 rounded-xl bg-[#F8F6FC] border border-[#EDE7F8] hover:bg-[#EDE7F8] text-sm font-bold flex items-center justify-center transition"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F8F6FC] rounded-2xl border border-[#EDE7F8]">
                    <span className="text-[10px] font-semibold text-[#302A38]/60 block uppercase">
                      Database Quoting Estimate
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xs font-bold text-[#6B4FA1]">R</span>
                      <span className="text-lg font-extrabold text-[#302A38]">
                        {totalEstimatedAmount.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-[#302A38]/60 ml-1">
                        (R{unitPrice.toFixed(2)} × {quantity}
                        {packagingDelivery > 0 ? ` + R${packagingDelivery} packaging` : ' • Free Delivery'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Estimated Completion Date Card */}
                <div className="p-3 bg-[#EDE7F8]/40 border border-[#B9A7E8]/40 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#6B4FA1]" />
                    <div>
                      <span className="font-bold text-[#302A38]">Estimated Completion Date: </span>
                      <span className="font-semibold text-[#6B4FA1]">
                        {estCompletion.targetDate.toLocaleDateString('en-ZA', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      <p className="text-[10px] text-[#302A38]/60 mt-0.5">{estCompletion.breakdown}</p>
                    </div>
                  </div>
                </div>

                {/* POPIA Consent Checkbox */}
                <div className="pt-2">
                  <label
                    htmlFor={popiaCheckboxId}
                    className="flex items-start gap-2.5 cursor-pointer text-xs text-[#302A38]/80"
                  >
                    <input
                      id={popiaCheckboxId}
                      type="checkbox"
                      checked={popiaConsent}
                      onChange={(e) => {
                        setPopiaConsent(e.target.checked);
                        if (consentError) validateConsent(e.target.checked);
                      }}
                      className="mt-0.5 rounded border-[#EDE7F8] text-[#6B4FA1] focus:ring-[#6B4FA1]"
                    />
                    <span>
                      I consent to CozyCup processing my contact details solely for order creation, quote calculation, and payment verification under POPIA. *
                    </span>
                  </label>
                  {consentError && <p className="text-[10px] text-rose-600 mt-1">{consentError}</p>}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-[#EDE7F8] flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-[#302A38]/70 hover:text-[#302A38]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <span>Review Order</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* STAGE 2: REVIEW */}
          {/* ================================================================= */}
          {stage === 'review' && (
            <div className="space-y-6">
              <div className="p-5 bg-[#F8F6FC] rounded-2xl border border-[#EDE7F8] space-y-4">
                <div className="flex items-center justify-between border-b border-[#EDE7F8] pb-3">
                  <h3 className="font-bold text-[#302A38] text-sm">Please Review Your Order Details</h3>
                  <span className="text-xs font-semibold text-[#6B4FA1]">CozyCup Boutique</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#302A38]/60 block mb-1">Customer Information</span>
                    <p className="font-semibold text-[#302A38]">{fullName}</p>
                    <p className="text-[#302A38]/80">{phone}</p>
                    <p className="text-[#302A38]/80">{email}</p>
                  </div>

                  <div>
                    <span className="text-[#302A38]/60 block mb-1">Item Requested</span>
                    <p className="font-bold text-[#302A38] text-sm">{itemRequested}</p>
                    <p className="text-[#6B4FA1] font-semibold">Category: {itemCategory}</p>
                    <p className="text-[#302A38]/80">Colour: {effectiveColour}</p>
                    <p className="text-[#302A38]/80">Quantity: {quantity} unit{quantity > 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#EDE7F8] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#302A38]/60 block mb-1">Estimated Completion</span>
                    <p className="font-bold text-[#302A38]">
                      {estCompletion.targetDate.toLocaleDateString('en-ZA', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-[11px] text-[#302A38]/70 mt-0.5">{estCompletion.breakdown}</p>
                  </div>

                  <div>
                    <span className="text-[#302A38]/60 block mb-1">Calculated Estimate</span>
                    <p className="text-base font-extrabold text-[#302A38]">
                      R{totalEstimatedAmount.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-[#302A38]/70">
                      R{unitPrice.toFixed(2)} × {quantity}
                      {packagingDelivery > 0 ? ` + R${packagingDelivery} packaging` : ' (Free delivery)'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>POPIA Consent Verified. Order will be recorded to Firestore database.</span>
              </div>

              <div className="pt-4 border-t border-[#EDE7F8] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStage('form')}
                  className="px-4 py-2 text-xs font-semibold text-[#302A38]/70 hover:text-[#302A38]"
                >
                  ← Edit Details
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitOrderToFirestore}
                  className="px-6 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>Submitting to Database...</span>
                  ) : (
                    <>
                      <span>Submit Order & Generate Quote</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STAGE 3: QUOTE */}
          {/* ================================================================= */}
          {stage === 'quote' && createdOrder && (
            <div className="space-y-6">
              <div className="p-5 bg-white rounded-2xl border border-[#EDE7F8] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-[#6B4FA1] uppercase tracking-wider">
                      Official CozyCup Quotation
                    </span>
                    <h3 className="font-black text-xl text-[#302A38]">
                      Order #{createdOrder.order_id}
                    </h3>
                  </div>
                  <button
                    onClick={() => handleCopy(createdOrder.order_id, 'orderId')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F8F6FC] hover:bg-[#EDE7F8] text-xs font-mono text-[#6B4FA1] border border-[#EDE7F8] transition"
                  >
                    {copiedField === 'orderId' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{createdOrder.order_id}</span>
                  </button>
                </div>

                {/* Quote Breakdown */}
                <div className="bg-[#F8F6FC] p-4 rounded-2xl border border-[#EDE7F8] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[#302A38]/80">
                    <span>{createdOrder.item_requested} ({createdOrder.colour}) × {createdOrder.quantity}</span>
                    <span className="font-semibold text-[#302A38]">
                      R{(createdOrder.quote_breakdown.subtotal || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#302A38]/80">
                    <span>Packaging & Courier Preparation</span>
                    <span className="font-semibold text-[#302A38]">
                      R{(createdOrder.quote_breakdown.packaging_delivery || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#EDE7F8] flex items-center justify-between text-sm">
                    <span className="font-bold text-[#302A38]">Total Quoted Amount</span>
                    <span className="font-black text-base text-[#6B4FA1]">
                      R{createdOrder.quoted_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-[#EDE7F8]/40 rounded-2xl border border-[#B9A7E8]/40 flex items-center gap-2 text-xs">
                  <Clock className="w-4 h-4 text-[#6B4FA1] shrink-0" />
                  <span>
                    Estimated completion:{' '}
                    <strong>
                      {new Date(createdOrder.estimated_completion_date).toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#EDE7F8] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onNavigateToTracker(createdOrder.order_id)}
                  className="px-4 py-2 text-xs font-semibold text-[#302A38]/70 hover:text-[#302A38]"
                >
                  Track Later
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleAcceptQuoteAndPay}
                  className="px-6 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>Accepting Quote...</span>
                  ) : (
                    <>
                      <span>Accept Quote & View FNB Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STAGE 4: FNB PAY */}
          {/* ================================================================= */}
          {stage === 'payment' && createdOrder && (
            <div className="space-y-6">
              {/* Official FNB Banking Card */}
              <div className="p-5 bg-linear-to-br from-[#0B2545] to-[#133C55] rounded-3xl text-white shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-amber-300" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                        Official CozyCup Banking
                      </span>
                      <h4 className="font-black text-lg">First National Bank (FNB)</h4>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/20">
                    EFT / Cheque Account
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
                    <span className="text-white/70 text-[10px] block">Account Name</span>
                    <span className="font-bold text-sm text-white">
                      {FNB_BANKING_DETAILS.accountName}
                    </span>
                  </div>

                  <div className="bg-white/10 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-white/70 text-[10px] block">Account Number</span>
                      <span className="font-mono font-bold text-sm text-amber-300">
                        {FNB_BANKING_DETAILS.accountNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(FNB_BANKING_DETAILS.accountNumber, 'accNo')}
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition"
                      title="Copy Account Number"
                    >
                      {copiedField === 'accNo' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                    </button>
                  </div>

                  <div className="bg-white/10 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-white/70 text-[10px] block">Branch Code</span>
                      <span className="font-mono font-bold text-sm text-white">
                        {FNB_BANKING_DETAILS.branchCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(FNB_BANKING_DETAILS.branchCode, 'branchCode')}
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition"
                      title="Copy Branch Code"
                    >
                      {copiedField === 'branchCode' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                    </button>
                  </div>

                  <div className="bg-white/10 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-white/70 text-[10px] block">CRITICAL Payment Reference</span>
                      <span className="font-mono font-bold text-sm text-amber-300">
                        {createdOrder.order_id}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(createdOrder.order_id, 'refCopy')}
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition"
                      title="Copy Reference"
                    >
                      {copiedField === 'refCopy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-amber-400/20 border border-amber-400/30 rounded-2xl text-[11px] text-amber-200">
                  ⚠️ <strong>Important:</strong> Please use your Order ID (<strong>{createdOrder.order_id}</strong>) as the exact payment reference. Your order will be placed into crafting as soon as payment is manually verified.
                </div>
              </div>

              {/* Proof of Payment Submission Form */}
              <form onSubmit={handleSubmitProof} className="space-y-4 p-5 bg-[#F8F6FC] rounded-2xl border border-[#EDE7F8]">
                <h4 className="text-xs font-bold text-[#302A38] uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-[#6B4FA1]" /> Submit Proof of Payment
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={referenceInputId} className="block text-xs font-medium text-[#302A38] mb-1">
                      Bank Reference / Deposit Ref *
                    </label>
                    <input
                      id={referenceInputId}
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder={createdOrder.order_id}
                      className="w-full bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor={payerNameInputId} className="block text-xs font-medium text-[#302A38] mb-1">
                      Payer / Account Holder Name
                    </label>
                    <input
                      id={payerNameInputId}
                      type="text"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      placeholder={fullName}
                      className="w-full bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Upload attachment simulation */}
                <div>
                  <label className="block text-xs font-medium text-[#302A38] mb-1">
                    Proof of Payment Document (PDF / JPEG)
                  </label>
                  <div className="border-2 border-dashed border-[#EDE7F8] hover:border-[#B9A7E8] bg-white rounded-2xl p-4 text-center cursor-pointer transition">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setFileName(file.name);
                      }}
                      className="hidden"
                      id="pop-file-input"
                    />
                    <label htmlFor="pop-file-input" className="cursor-pointer flex flex-col items-center gap-1.5">
                      <Upload className="w-6 h-6 text-[#6B4FA1]" />
                      <span className="text-xs font-semibold text-[#6B4FA1]">
                        {fileName ? `Selected: ${fileName}` : 'Click to select or drag proof of payment'}
                      </span>
                      <span className="text-[10px] text-[#302A38]/50">
                        Supports PDF, PNG, JPG (Max 10MB)
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor={notesInputId} className="block text-xs font-medium text-[#302A38] mb-1">
                    Additional Transfer Notes (Optional)
                  </label>
                  <input
                    id={notesInputId}
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Paid via FNB app"
                    className="w-full bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onNavigateToTracker(createdOrder.order_id)}
                    className="px-4 py-2 text-xs font-semibold text-[#302A38]/70 hover:text-[#302A38]"
                  >
                    I Will Pay Later
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <span>Submitting Proof...</span>
                    ) : (
                      <>
                        <span>Submit Proof of Payment</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================================================================= */}
          {/* STAGE 5: VERIFICATION */}
          {/* ================================================================= */}
          {stage === 'verification' && createdOrder && (
            <div className="space-y-6 text-center py-4">
              {createdOrder.payment_status === 'Verified' ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle className="w-8 h-8" />
                  </div>

                  <h3 className="text-2xl font-black text-[#302A38]">
                    Payment Verified! Order Status: Paid
                  </h3>

                  <p className="text-xs text-[#302A38]/80 max-w-md mx-auto leading-relaxed">
                    Ms Roseane has verified your FNB electronic funds transfer. Your handcrafted item has been scheduled for crafting!
                  </p>

                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 max-w-md mx-auto">
                    📅 Calendar milestone scheduled for:{' '}
                    <strong>
                      {new Date(createdOrder.estimated_completion_date).toLocaleDateString('en-ZA', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
                    <Clock className="w-8 h-8" />
                  </div>

                  <h3 className="text-2xl font-black text-[#302A38]">
                    Proof Submitted — Pending Owner Verification
                  </h3>

                  <p className="text-xs text-[#302A38]/80 max-w-md mx-auto leading-relaxed">
                    Thank you! Your payment proof for Order{' '}
                    <strong className="font-mono text-[#6B4FA1]">{createdOrder.order_id}</strong> has been received into our database.
                  </p>

                  <div className="p-4 bg-[#F8F6FC] border border-[#EDE7F8] rounded-2xl text-xs text-[#302A38]/80 max-w-md mx-auto text-left space-y-2">
                    <div className="flex items-center gap-2 font-bold text-[#6B4FA1]">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Two-Step Verification Protocol</span>
                    </div>
                    <p className="text-[11px] text-[#302A38]/70">
                      Our boutique owner (Ms Roseane) verifies all FNB deposits against official bank records before crafting commences. This page updates in real time once verified.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigateToTracker(createdOrder.order_id)}
                  className="px-6 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4" />
                  <span>Track Order in Real-Time</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-[#F8F6FC] hover:bg-[#EDE7F8] text-[#302A38] text-xs font-semibold rounded-xl border border-[#EDE7F8] transition"
                >
                  Done / Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
