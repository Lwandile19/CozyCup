import React, { useState, useId } from 'react';
import { Order } from '../../types';
import {
  updateQuoteInFirestore,
  FIRESTORE_ERROR_MSG
} from '../../services/firestoreService';
import {
  X,
  DollarSign,
  FileCheck,
  Clock,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface OrderQuoteModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOrder: Order) => void;
}

export const OrderQuoteModal: React.FC<OrderQuoteModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess
}) => {
  if (!isOpen || !order) return null;

  const [quotedAmount, setQuotedAmount] = useState(
    order.quoted_amount?.toString() || '85.00'
  );
  const [subtotal, setSubtotal] = useState(
    (order.quote_breakdown?.subtotal || order.quoted_amount)?.toString() || '85.00'
  );
  const [packagingDelivery, setPackagingDelivery] = useState(
    (order.quote_breakdown?.packaging_delivery || 0).toString()
  );
  const [leadDays, setLeadDays] = useState('3');
  const [quoteNotes, setQuoteNotes] = useState(
    order.estimated_completion_note || 'Standard handcrafted lead time'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const quoteSubtotalInputId = useId();
  const quoteDeliveryInputId = useId();
  const quoteTotalInputId = useId();
  const quoteDaysInputId = useId();
  const quoteNotesInputId = useId();

  const handleSubtotalChange = (val: string) => {
    setSubtotal(val);
    const sub = parseFloat(val) || 0;
    const pack = parseFloat(packagingDelivery) || 0;
    setQuotedAmount((sub + pack).toFixed(2));
  };

  const handleDeliveryChange = (val: string) => {
    setPackagingDelivery(val);
    const sub = parseFloat(subtotal) || 0;
    const pack = parseFloat(val) || 0;
    setQuotedAmount((sub + pack).toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const parsedTotal = parseFloat(quotedAmount) || 0;
      const parsedSub = parseFloat(subtotal) || 0;
      const parsedPack = parseFloat(packagingDelivery) || 0;
      const parsedDays = parseInt(leadDays, 10) || 3;

      const updated = await updateQuoteInFirestore(
        order.order_id,
        parsedTotal,
        {
          subtotal: parsedSub,
          packaging_delivery: parsedPack,
          special_colour_surcharge: 0,
          notes: quoteNotes.trim()
        },
        parsedDays
      );

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || FIRESTORE_ERROR_MSG);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#302A38]/50 backdrop-blur-xs">
      <div
        className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#EDE7F8] shadow-2xl space-y-4 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#EDE7F8] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EDE7F8] text-[#6B4FA1] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#302A38] text-sm">
                Create / Adjust Quote: #{order.order_id}
              </h3>
              <p className="text-[10px] text-[#302A38]/60">
                Customer: {order.customer.full_name} • {order.item_requested}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#302A38]/60 hover:text-[#302A38] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={quoteSubtotalInputId} className="block font-medium text-[#302A38] mb-1">
                Subtotal (ZAR) *
              </label>
              <input
                id={quoteSubtotalInputId}
                type="number"
                step="0.5"
                value={subtotal}
                onChange={(e) => handleSubtotalChange(e.target.value)}
                className="w-full bg-[#F8F6FC] border border-[#EDE7F8] rounded-xl px-3 py-2 text-xs font-bold"
                required
              />
            </div>

            <div>
              <label htmlFor={quoteDeliveryInputId} className="block font-medium text-[#302A38] mb-1">
                Courier / Packaging (ZAR)
              </label>
              <input
                id={quoteDeliveryInputId}
                type="number"
                step="1"
                value={packagingDelivery}
                onChange={(e) => handleDeliveryChange(e.target.value)}
                className="w-full bg-[#F8F6FC] border border-[#EDE7F8] rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>
          </div>

          <div className="p-3 bg-[#EDE7F8]/40 border border-[#B9A7E8]/40 rounded-2xl flex items-center justify-between">
            <span className="font-bold text-[#302A38]">Total Quoted Amount</span>
            <div className="flex items-center gap-1">
              <span className="font-bold text-[#6B4FA1]">R</span>
              <input
                id={quoteTotalInputId}
                aria-label="Total Quoted Amount in ZAR"
                type="number"
                step="0.5"
                value={quotedAmount}
                onChange={(e) => setQuotedAmount(e.target.value)}
                className="w-24 text-right bg-white border border-[#EDE7F8] rounded-lg px-2 py-1 text-sm font-black text-[#6B4FA1]"
              />
            </div>
          </div>

          <div>
            <label htmlFor={quoteDaysInputId} className="block font-medium text-[#302A38] mb-1">
              Estimated Completion Days from Payment *
            </label>
            <input
              id={quoteDaysInputId}
              type="number"
              min="1"
              value={leadDays}
              onChange={(e) => setLeadDays(e.target.value)}
              className="w-full bg-[#F8F6FC] border border-[#EDE7F8] rounded-xl px-3 py-2 text-xs font-bold"
            />
          </div>

          <div>
            <label htmlFor={quoteNotesInputId} className="block font-medium text-[#302A38] mb-1">
              Quotation Note for Customer
            </label>
            <input
              id={quoteNotesInputId}
              type="text"
              value={quoteNotes}
              onChange={(e) => setQuoteNotes(e.target.value)}
              placeholder="e.g. Includes premium cotton yarn and branded tag"
              className="w-full bg-[#F8F6FC] border border-[#EDE7F8] rounded-xl px-3 py-2 text-xs"
            />
          </div>

          <div className="pt-3 border-t border-[#EDE7F8] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#302A38]/70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Updating...' : 'Save & Send Quote'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
