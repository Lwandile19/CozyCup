import React from 'react';
import { Product } from '../types';
import { X, ShoppingCart, CheckCircle2, AlertTriangle, Clock, Heart, Sparkles } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onPlaceOrder: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onPlaceOrder
}) => {
  if (!product) return null;

  const isOutOfStock = product.stock_quantity <= 0 && product.availability_status !== 'Made to Order';
  const isMadeToOrder = product.availability_status === 'Made to Order';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#302A38]/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-[#EDE7F8] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE7F8] bg-[#F8F6FC]">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EDE7F8] text-[#6B4FA1] border border-[#B9A7E8]/40">
              {product.category}
            </span>
            <span className="text-xs font-mono text-[#6B4FA1]">ID: {product.product_id}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#302A38]/60 hover:text-[#302A38] hover:bg-[#EDE7F8] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Image Stage */}
            <div className="rounded-2xl overflow-hidden bg-[#F8F6FC] border border-[#EDE7F8] aspect-4/3 relative shadow-inner">
              <img
                src={product.image_url}
                alt={product.product_name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
            </div>

            {/* Title & Quoting Basics */}
            <div className="flex flex-col justify-between h-full space-y-4">
              <div>
                <h2 className="text-xl font-bold text-[#302A38] leading-tight">
                  {product.product_name}
                </h2>
                <p className="text-xs text-[#302A38]/75 mt-2 leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="bg-[#F8F6FC] rounded-2xl p-4 border border-[#EDE7F8] space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-[#6B4FA1]">Database Price</span>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#6B4FA1] mr-1">R</span>
                    <span className="text-2xl font-black text-[#302A38]">
                      {product.price.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-[#302A38]/60 block">per handcrafted item</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#EDE7F8]">
                  <span className="text-[#302A38]/70 font-medium">Availability</span>
                  {isOutOfStock ? (
                    <span className="text-rose-600 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Out of stock
                    </span>
                  ) : isMadeToOrder ? (
                    <span className="text-[#6B4FA1] font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Made to Order
                    </span>
                  ) : (
                    <span className="text-[#6B4FA1] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#6B4FA1]" />
                      {product.stock_quantity} available in database
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-[#302A38]/70">
                  <span>Handcrafting Lead Time</span>
                  <span className="font-semibold flex items-center gap-1 text-[#302A38]">
                    <Clock className="w-3.5 h-3.5 text-[#6B4FA1]" /> {product.lead_time_days} business day{product.lead_time_days > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Handcraft Quality Highlights */}
          <div className="p-4 bg-[#EDE7F8]/50 rounded-2xl border border-[#B9A7E8]/30">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B4FA1] mb-2 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-[#6B4FA1]" />
              CozyCup Handmade Guarantee
            </h4>
            <p className="text-xs text-[#302A38]/80 leading-relaxed">
              Every item is lovingly crocheted and assembled by hand in South Africa using premium cotton yarns, durable elastic cords, and gentle hypoallergenic materials.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-[#EDE7F8] bg-[#F8F6FC] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#302A38]/70 hover:text-[#302A38] transition"
          >
            Back to Catalogue
          </button>

          <button
            id="modal-place-order-button"
            disabled={isOutOfStock}
            onClick={() => {
              onClose();
              onPlaceOrder(product);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition ${
              isOutOfStock
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-[#6B4FA1] text-white hover:bg-[#6B4FA1]/90'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Place Order for this Item</span>
          </button>
        </div>
      </div>
    </div>
  );
};
