import React from 'react';
import { Product } from '../types';
import { ShoppingCart, CheckCircle2, Clock, Sparkles, AlertCircle, Zap } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  onPlaceOrder: (product: Product) => void;
  onQuickOrder?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
  onPlaceOrder,
  onQuickOrder
}) => {
  const isOutOfStock = product.stock_quantity <= 0 && product.availability_status !== 'Made to Order';
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity < 5;
  const isMadeToOrder = product.availability_status === 'Made to Order';
  const isQuickEligible = product.is_quick_order !== false && !isOutOfStock;

  return (
    <div
      id={`product-card-${product.product_id}`}
      className="group bg-white rounded-2xl border border-[#EDE7F8] hover:border-[#B9A7E8] hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden text-left"
    >
      {/* Product Image Stage */}
      <div
        className="relative aspect-4/3 bg-[#F8F6FC] overflow-hidden cursor-pointer"
        onClick={() => onSelectProduct(product)}
      >
        <img
          src={product.image_url}
          alt={product.product_name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-500"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />

        {/* Category Badge */}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 text-[#6B4FA1] border border-[#EDE7F8] shadow-xs backdrop-blur-xs">
          {product.category}
        </span>

        {/* Stock / Availability Status Pill */}
        <div className="absolute bottom-3 left-3">
          {isOutOfStock ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <AlertCircle className="w-3 h-3 text-rose-600" />
              Out of stock
            </span>
          ) : isMadeToOrder ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EDE7F8] text-[#6B4FA1] border border-[#B9A7E8]/50">
              <Sparkles className="w-3 h-3 text-[#6B4FA1]" />
              Made to Order
            </span>
          ) : isLowStock ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Only {product.stock_quantity} left in DB
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EDE7F8] text-[#6B4FA1] border border-[#B9A7E8]/40">
              <CheckCircle2 className="w-3 h-3 text-[#6B4FA1]" />
              {product.stock_quantity} in stock
            </span>
          )}
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-[#302A38]/60 mb-2">
            <span className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3 text-[#6B4FA1]" />
              {product.lead_time_days} day{product.lead_time_days > 1 ? 's' : ''} lead time
            </span>
            <span className="text-[10px] font-mono text-[#6B4FA1] bg-[#EDE7F8] px-1.5 py-0.5 rounded">
              {product.product_id}
            </span>
          </div>

          <h3
            onClick={() => onSelectProduct(product)}
            className="font-bold text-[#302A38] text-base leading-snug group-hover:text-[#6B4FA1] cursor-pointer line-clamp-2 transition"
          >
            {product.product_name}
          </h3>

          <p className="text-xs text-[#302A38]/70 mt-2 line-clamp-2 leading-relaxed">
            {product.short_description || product.description}
          </p>
        </div>

        {/* Bottom Price & Action Buttons */}
        <div className="mt-5 pt-4 border-t border-[#EDE7F8] flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-[#302A38]/60 block">
              Verified DB Price
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-semibold text-[#6B4FA1]">R</span>
              <span className="text-xl font-bold text-[#302A38]">
                {product.price.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id={`btn-details-${product.product_id}`}
              onClick={() => onSelectProduct(product)}
              className="px-2.5 py-1.5 text-xs font-semibold text-[#6B4FA1] hover:bg-[#EDE7F8] rounded-xl transition"
            >
              Details
            </button>
            {onQuickOrder && isQuickEligible && (
              <button
                id={`btn-quick-order-${product.product_id}`}
                onClick={() => onQuickOrder(product)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition shadow-2xs"
                title="Quick checkout for in-stock pre-made item"
              >
                <Zap className="w-3 h-3 text-amber-700" />
                <span>Quick</span>
              </button>
            )}
            <button
              id={`btn-place-order-${product.product_id}`}
              disabled={isOutOfStock}
              onClick={() => onPlaceOrder(product)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                isOutOfStock
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : 'bg-[#6B4FA1] text-white hover:bg-[#6B4FA1]/90'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Place Order</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
