import React, { useState, useEffect, useId } from 'react';
import { Product, InventoryItem } from '../../types';
import {
  saveProductInFirestore,
  deleteProductInFirestore,
  FIRESTORE_ERROR_MSG
} from '../../services/firestoreService';
import {
  X,
  Sparkles,
  Zap,
  Tag,
  Package,
  Clock,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface ProductManagerModalProps {
  product: Product | null; // If null, adding new product
  inventory: InventoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductManagerModal: React.FC<ProductManagerModalProps> = ({
  product,
  inventory,
  isOpen,
  onClose,
  onSuccess
}) => {
  if (!isOpen) return null;

  const [productName, setProductName] = useState(product?.product_name || '');
  const [category, setCategory] = useState<'Crochet' | 'Bracelets' | 'Custom Orders'>(
    (product?.category as 'Crochet' | 'Bracelets' | 'Custom Orders') || 'Crochet'
  );
  const [price, setPrice] = useState(product?.price?.toString() || '85.00');
  const [stockQuantity, setStockQuantity] = useState(
    product?.stock_quantity?.toString() || '10'
  );
  const [availabilityStatus, setAvailabilityStatus] = useState<
    'In Stock' | 'Low Stock' | 'Made to Order' | 'Out of Stock'
  >(product?.availability_status || 'In Stock');
  const [leadTimeDays, setLeadTimeDays] = useState(
    product?.lead_time_days?.toString() || '3'
  );
  const [imageUrl, setImageUrl] = useState(
    product?.image_url ||
      'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&q=80&w=800'
  );
  const [description, setDescription] = useState(
    product?.description || ''
  );
  const [shortDescription, setShortDescription] = useState(
    product?.short_description || ''
  );
  const [isQuickOrder, setIsQuickOrder] = useState<boolean>(
    product?.is_quick_order ?? true
  );
  const [isFeatured, setIsFeatured] = useState<boolean>(
    product?.is_featured ?? false
  );
  const [linkedMaterialIds, setLinkedMaterialIds] = useState<string[]>(
    product?.linked_material_ids || []
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prodNameInputId = useId();
  const prodCatSelectId = useId();
  const prodPriceInputId = useId();
  const prodStockInputId = useId();
  const prodAvailSelectId = useId();
  const prodLeadInputId = useId();
  const prodImgInputId = useId();
  const prodDescTextId = useId();
  const prodShortInputId = useId();
  const prodQuickCheckId = useId();
  const prodFeatCheckId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const prodId = product?.product_id || `prod-${Date.now()}`;
      await saveProductInFirestore({
        product_id: prodId,
        product_name: productName.trim(),
        category,
        price: parseFloat(price) || 0,
        currency: 'ZAR',
        stock_quantity: parseInt(stockQuantity, 10) || 0,
        availability_status: availabilityStatus,
        lead_time_days: parseInt(leadTimeDays, 10) || 3,
        image_url: imageUrl.trim(),
        description: description.trim(),
        short_description: shortDescription.trim(),
        is_quick_order: isQuickOrder,
        is_featured: isFeatured,
        linked_material_ids: linkedMaterialIds,
        active: true
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || FIRESTORE_ERROR_MSG);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[#302A38]/50 backdrop-blur-xs overflow-y-auto">
      <div
        className="bg-white rounded-3xl p-6 max-w-xl w-full border border-[#EDE7F8] shadow-2xl space-y-4 my-6 max-h-[92vh] flex flex-col text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#EDE7F8] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EDE7F8] text-[#6B4FA1] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#302A38] text-sm">
                {product ? `Edit Product: ${product.product_name}` : 'Add New Product to Database'}
              </h3>
              <p className="text-[10px] text-[#302A38]/60">
                Direct Firestore write • Updates customer catalog immediately
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

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
          <div>
            <label htmlFor={prodNameInputId} className="block font-semibold text-[#302A38] mb-1">
              Product Name *
            </label>
            <input
              id={prodNameInputId}
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. CozyCup Classic Crochet Mug Cozy"
              className="w-full bg-[#F8F6FC] border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor={prodCatSelectId} className="block font-semibold text-[#302A38] mb-1">
                Category *
              </label>
              <select
                id={prodCatSelectId}
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-[#F8F6FC] border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs focus:outline-none"
              >
                <option value="Crochet">Crochet</option>
                <option value="Bracelets">Bracelets</option>
                <option value="Custom Orders">Custom Orders</option>
              </select>
            </div>

            <div>
              <label htmlFor={prodPriceInputId} className="block font-semibold text-[#302A38] mb-1">
                Database Price (ZAR) *
              </label>
              <input
                id={prodPriceInputId}
                type="number"
                step="0.5"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-[#F8F6FC] border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                required
              />
            </div>

            <div>
              <label htmlFor={prodStockInputId} className="block font-semibold text-[#302A38] mb-1">
                Stock Quantity *
              </label>
              <input
                id={prodStockInputId}
                type="number"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full bg-[#F8F6FC] border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={prodAvailSelectId} className="block font-semibold text-[#302A38] mb-1">
                Availability Status *
              </label>
              <select
                id={prodAvailSelectId}
                value={availabilityStatus}
                onChange={(e) => setAvailabilityStatus(e.target.value as any)}
                className="w-full bg-[#F8F6FC] border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs focus:outline-none"
              >
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Made to Order">Made to Order</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>

            <div>
              <label htmlFor={prodLeadInputId} className="block font-semibold text-[#302A38] mb-1">
                Lead Time (Business Days) *
              </label>
              <input
                id={prodLeadInputId}
                type="number"
                min="1"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="w-full bg-[#F8F6FC] border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor={prodImgInputId} className="block font-semibold text-[#302A38] mb-1">
              Image URL
            </label>
            <input
              id={prodImgInputId}
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#F8F6FC] border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor={prodShortInputId} className="block font-semibold text-[#302A38] mb-1">
              Short Summary
            </label>
            <input
              id={prodShortInputId}
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="e.g. Soft chunky yarn mug hugger with wooden button"
              className="w-full bg-[#F8F6FC] border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor={prodDescTextId} className="block font-semibold text-[#302A38] mb-1">
              Detailed Description
            </label>
            <textarea
              id={prodDescTextId}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Care instructions, craft materials, dimensions..."
              className="w-full bg-[#F8F6FC] border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl p-2.5 text-xs focus:outline-none"
            />
          </div>

          {/* Quick Order & Featured Toggles (Requirements 7 & 9) */}
          <div className="p-3 bg-[#EDE7F8]/40 border border-[#B9A7E8]/40 rounded-2xl space-y-2">
            <span className="font-bold text-[#6B4FA1] block text-[11px] uppercase tracking-wider">
              Customer Storefront Settings
            </span>

            <div className="flex flex-col sm:flex-row gap-4">
              <label htmlFor={prodQuickCheckId} className="flex items-center gap-2 cursor-pointer">
                <input
                  id={prodQuickCheckId}
                  type="checkbox"
                  checked={isQuickOrder}
                  onChange={(e) => setIsQuickOrder(e.target.checked)}
                  className="rounded text-[#6B4FA1]"
                />
                <span className="font-medium text-[#302A38] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Show in Quick Order Options (Home Page)</span>
                </span>
              </label>

              <label htmlFor={prodFeatCheckId} className="flex items-center gap-2 cursor-pointer">
                <input
                  id={prodFeatCheckId}
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded text-[#6B4FA1]"
                />
                <span className="font-medium text-[#302A38] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#6B4FA1]" />
                  <span>Featured Product</span>
                </span>
              </label>
            </div>
          </div>

          {/* Linked Materials Selection (Requirement 8) */}
          {inventory.length > 0 && (
            <div>
              <label className="block font-semibold text-[#302A38] mb-1">
                Link Required Materials from Inventory
              </label>
              <div className="max-h-24 overflow-y-auto border border-[#EDE7F8] rounded-xl p-2 space-y-1 bg-[#F8F6FC]">
                {inventory.map((mat) => (
                  <label key={mat.material_id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkedMaterialIds.includes(mat.material_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLinkedMaterialIds((prev) => [...prev, mat.material_id]);
                        } else {
                          setLinkedMaterialIds((prev) => prev.filter((id) => id !== mat.material_id));
                        }
                      }}
                      className="rounded text-[#6B4FA1]"
                    />
                    <span>
                      {mat.name} ({mat.quantity} {mat.unit} in stock)
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

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
              className="px-6 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              {isSubmitting ? 'Saving to Database...' : product ? 'Update Product' : 'Add to Catalogue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
