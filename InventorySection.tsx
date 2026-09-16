import React, { useState, useId } from 'react';
import { InventoryItem, Product } from '../../types';
import {
  saveInventoryItemInFirestore,
  updateInventoryQuantityInFirestore,
  deleteInventoryItemInFirestore,
  FIRESTORE_ERROR_MSG
} from '../../services/firestoreService';
import {
  Package,
  Plus,
  AlertTriangle,
  Edit2,
  Trash2,
  CheckCircle2,
  Layers,
  Sparkles,
  Link,
  Search,
  Filter
} from 'lucide-react';

interface InventorySectionProps {
  inventory: InventoryItem[];
  products: Product[];
}

export const InventorySection: React.FC<InventorySectionProps> = ({
  inventory,
  products
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Yarn' | 'Thread' | 'Beads' | 'Hardware' | 'Packaging' | 'Other'>('Yarn');
  const [quantity, setQuantity] = useState('50');
  const [unit, setUnit] = useState('skeins');
  const [minThreshold, setMinThreshold] = useState('5');
  const [costPerUnit, setCostPerUnit] = useState('35');
  const [notes, setNotes] = useState('');
  const [linkedProductIds, setLinkedProductIds] = useState<string[]>([]);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputId = useId();
  const categorySelectId = useId();
  const qtyInputId = useId();
  const unitInputId = useId();
  const thresholdInputId = useId();
  const costInputId = useId();
  const notesInputId = useId();

  const resetForm = () => {
    setName('');
    setCategory('Yarn');
    setQuantity('50');
    setUnit('skeins');
    setMinThreshold('5');
    setCostPerUnit('35');
    setNotes('');
    setLinkedProductIds([]);
    setEditingItem(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category as any);
    setQuantity(item.quantity.toString());
    setUnit(item.unit);
    setMinThreshold(item.min_threshold.toString());
    setCostPerUnit(item.cost_per_unit.toString());
    setNotes(item.notes || '');
    setLinkedProductIds(item.linked_product_ids || []);
    setShowAddModal(true);
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await saveInventoryItemInFirestore({
        material_id: editingItem ? editingItem.material_id : `mat-${Date.now()}`,
        name: name.trim(),
        category,
        quantity: parseFloat(quantity) || 0,
        unit: unit.trim() || 'units',
        min_threshold: parseFloat(minThreshold) || 5,
        cost_per_unit: parseFloat(costPerUnit) || 0,
        notes: notes.trim(),
        linked_product_ids: linkedProductIds
      });

      setFeedback(`Material "${name}" saved to database successfully.`);
      setShowAddModal(false);
      resetForm();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(err.message || FIRESTORE_ERROR_MSG);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdjust = async (materialId: string, currentQty: number, delta: number) => {
    try {
      const nextQty = Math.max(0, currentQty + delta);
      await updateInventoryQuantityInFirestore(materialId, nextQty);
    } catch (err: any) {
      alert('Failed to update quantity: ' + err.message);
    }
  };

  const handleDelete = async (materialId: string, matName: string) => {
    if (!confirm(`Are you sure you want to remove "${matName}" from inventory?`)) {
      return;
    }
    try {
      await deleteInventoryItemInFirestore(materialId);
      setFeedback(`Removed material "${matName}".`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert('Failed to delete material: ' + err.message);
    }
  };

  // Filter materials
  const filtered = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const lowInventoryItems = inventory.filter((item) => item.quantity <= item.min_threshold);

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner & Low Material Alerts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-[#302A38] flex items-center gap-2">
            <Package className="w-5 h-5 text-[#6B4FA1]" />
            <span>Raw Materials & Inventory Management</span>
          </h3>
          <p className="text-xs text-[#302A38]/70 mt-1">
            Track yarn skeins, cords, beads, and materials. Changes sync in real-time to product availability.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white rounded-xl text-xs font-bold transition shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Material</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Prominent Low Inventory Warning Banner (Requirement 8) */}
      {lowInventoryItems.length > 0 && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300/80 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Low Material Warning: {lowInventoryItems.length} item(s) below restocking threshold!</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {lowInventoryItems.map((mat) => (
              <span
                key={mat.material_id}
                className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-medium text-amber-900 flex items-center gap-1.5 shadow-2xs"
              >
                <strong>{mat.name}</strong>: {mat.quantity} {mat.unit} left (Min: {mat.min_threshold})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#EDE7F8]">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#302A38]/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search materials, yarn colours, notes..."
            className="w-full bg-[#F8F6FC] border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl pl-9 pr-3 py-2 text-xs text-[#302A38] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#6B4FA1]" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#F8F6FC] border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none"
          >
            <option value="ALL">All Material Types</option>
            <option value="Yarn">Yarn</option>
            <option value="Thread">Thread</option>
            <option value="Beads">Beads</option>
            <option value="Hardware">Hardware</option>
            <option value="Packaging">Packaging</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-2xl border border-[#EDE7F8] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8F6FC] border-b border-[#EDE7F8] text-[#302A38]/60 uppercase text-[10px] tracking-wider font-semibold">
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">In Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Unit Cost</th>
                <th className="px-4 py-3">Linked Products</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE7F8]">
              {filtered.map((mat) => {
                const isLow = mat.quantity <= mat.min_threshold;
                return (
                  <tr key={mat.material_id} className="hover:bg-[#F8F6FC]/60 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#302A38]">{mat.name}</div>
                      {mat.notes && <div className="text-[10px] text-[#302A38]/60 mt-0.5">{mat.notes}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EDE7F8] text-[#6B4FA1]">
                        {mat.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#302A38]">
                          {mat.quantity} <span className="text-[11px] font-normal text-[#302A38]/70">{mat.unit}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleQuickAdjust(mat.material_id, mat.quantity, -1)}
                            className="w-5 h-5 rounded bg-[#F8F6FC] hover:bg-stone-200 border border-[#EDE7F8] flex items-center justify-center text-[11px] font-bold"
                            title="Decrease 1"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleQuickAdjust(mat.material_id, mat.quantity, 1)}
                            className="w-5 h-5 rounded bg-[#F8F6FC] hover:bg-stone-200 border border-[#EDE7F8] flex items-center justify-center text-[11px] font-bold"
                            title="Increase 1"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Low Stock (≤{mat.min_threshold})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Adequate
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#302A38]">
                      R{mat.cost_per_unit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-[#6B4FA1]">
                        {mat.linked_product_ids && mat.linked_product_ids.length > 0
                          ? `${mat.linked_product_ids.length} product(s)`
                          : 'General Material'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(mat)}
                        className="p-1.5 text-[#6B4FA1] hover:bg-[#EDE7F8] rounded-lg transition"
                        title="Edit material"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(mat.material_id, mat.name)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs text-[#302A38]/50">
                    No materials found. Click "Add New Material" to register yarn, beads, or thread.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#302A38]/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-[#EDE7F8] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDE7F8] pb-3">
              <h4 className="font-bold text-[#302A38] text-sm">
                {editingItem ? 'Edit Raw Material' : 'Add New Raw Material'}
              </h4>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-[#302A38]/50 hover:text-[#302A38]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-3 text-xs">
              <div>
                <label htmlFor={nameInputId} className="block font-medium text-[#302A38] mb-1">
                  Material Name *
                </label>
                <input
                  id={nameInputId}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chunky Chenille Yarn - Dusty Rose"
                  className="w-full bg-[#F8F6FC] border border-[#EDE7F8] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6B4FA1]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={categorySelectId} className="block font-medium text-[#302A38] mb-1">
                    Category *
                  </label>
                  <select
                    id={categorySelectId}
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-[#F8F6FC] border border-[#EDE7F8] rounded-xl px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Yarn">Yarn</option>
                    <option value="Thread">Thread</option>
                    <option value="Beads">Beads</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor={unitInputId} className="block font-medium text-[#302A38] mb-1">
                    Unit of Measure *
                  </label>
                  <input
                    id={unitInputId}
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="skeins, meters, grams, pieces"
                    className="w-full bg-[#F8F6FC] border border-[#EDE7F8] rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor={qtyInputId} className="block font-medium text-[#302A38] mb-1">
                    Quantity *
                  </label>
                  <input
                    id={qtyInputId}
                    type="number"
                    step="0.1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-[#F8F6FC] border border-[#EDE7F8] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor={thresholdInputId} className="block font-medium text-[#302A38] mb-1">
                    Min Threshold *
                  </label>
                  <input
                    id={thresholdInputId}
                    type="number"
                    step="1"
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(e.target.value)}
                    className="w-full bg-[#F8F6FC] border border-[#EDE7F8] rounded-xl px-3 py-2 text-xs font-bold text-amber-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor={costInputId} className="block font-medium text-[#302A38] mb-1">
                    Unit Cost (R)
                  </label>
                  <input
                    id={costInputId}
                    type="number"
                    step="0.01"
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)}
                    className="w-full bg-[#F8F6FC] border border-[#EDE7F8] rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={notesInputId} className="block font-medium text-[#302A38] mb-1">
                  Supplier / Sourcing Notes
                </label>
                <input
                  id={notesInputId}
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Purchased from Arthur Bales, Bellville"
                  className="w-full bg-[#F8F6FC] border border-[#EDE7F8] rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[#302A38] mb-1 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-[#6B4FA1]" />
                  <span>Link to Products (Optional)</span>
                </label>
                <div className="max-h-28 overflow-y-auto border border-[#EDE7F8] rounded-xl p-2 space-y-1 bg-[#F8F6FC]">
                  {products.map((p) => {
                    const isChecked = linkedProductIds.includes(p.product_id);
                    return (
                      <label key={p.product_id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setLinkedProductIds((prev) => [...prev, p.product_id]);
                            } else {
                              setLinkedProductIds((prev) => prev.filter((id) => id !== p.product_id));
                            }
                          }}
                          className="rounded text-[#6B4FA1]"
                        />
                        <span>{p.product_name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-[#EDE7F8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#302A38]/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Save Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
