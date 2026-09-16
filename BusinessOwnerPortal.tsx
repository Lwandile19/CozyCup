import React, { useState, useEffect } from 'react';
import {
  Order,
  OrderStatus,
  Product,
  InventoryItem,
  BusinessOwnerSession,
  FNB_BANKING_DETAILS,
  OwnerNotification,
  CalendarEvent,
  BusinessSettings,
  DEFAULT_SETTINGS
} from '../types';
import {
  subscribeToOrders,
  subscribeToProducts,
  subscribeToInventory,
  subscribeToNotifications,
  verifyPaymentInFirestore,
  updateOrderStatusInFirestore,
  archiveOrderInFirestore,
  deleteProductInFirestore,
  FIRESTORE_ERROR_MSG
} from '../services/firestoreService';
import {
  fetchOwnerCustomers,
  anonymizeCustomerPII,
  fetchOwnerNotifications,
  markNotificationRead,
  fetchOwnerCalendar,
  fetchOwnerSettings,
  updateOwnerSettings
} from '../api';
import {
  requestGoogleCalendarAccess,
  getStoredGCalToken,
  clearGCalToken,
  syncOrderToGoogleCalendar
} from '../services/calendarService';
import { InventorySection } from './owner/InventorySection';
import { ProductManagerModal } from './owner/ProductManagerModal';
import { OrderQuoteModal } from './owner/OrderQuoteModal';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Archive,
  ArchiveRestore,
  RefreshCw,
  Search,
  Check,
  Building2,
  Layers,
  ArrowRight,
  Eye,
  FileCheck,
  AlertTriangle,
  UserCheck,
  Filter,
  Plus,
  Edit2,
  Lock,
  Trash2,
  Package,
  Heart,
  Calendar,
  DollarSign,
  Bell,
  Settings,
  Palette,
  AlertCircle,
  Mail,
  ExternalLink,
  Zap
} from 'lucide-react';

interface BusinessOwnerPortalProps {
  ownerSession: BusinessOwnerSession | null;
  onNavigateToTracker: (orderId: string) => void;
  onUnauthorizedRedirect: () => void;
}

export const BusinessOwnerPortal: React.FC<BusinessOwnerPortalProps> = ({
  ownerSession,
  onNavigateToTracker,
  onUnauthorizedRedirect
}) => {
  // If not authenticated as Business Owner, automatically redirect to Customer Home Page (Section 2.3)
  useEffect(() => {
    if (!ownerSession || ownerSession.role !== 'BUSINESS_OWNER') {
      onUnauthorizedRedirect();
    }
  }, [ownerSession, onUnauthorizedRedirect]);

  // Main Tabs: 'overview' | 'orders' | 'verification' | 'inventory' | 'products' | 'notifications' | 'calendar' | 'customers' | 'settings' | 'archived'
  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'verification' | 'inventory' | 'products' | 'notifications' | 'calendar' | 'customers' | 'settings' | 'archived'
  >('overview');

  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState<{
    total_active: number;
    pending_quotes: number;
    awaiting_payment: number;
    pending_verification: number;
    paid: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    archived: number;
  }>({
    total_active: 0,
    pending_quotes: 0,
    awaiting_payment: 0,
    pending_verification: 0,
    paid: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    archived: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Inventory & Products State (Direct Firestore Subscriptions)
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
  const [showProductManagerModal, setShowProductManagerModal] = useState(false);

  // Quote Adjustment Modal
  const [orderForQuoteModal, setOrderForQuoteModal] = useState<Order | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  // Notifications & Calendar State (Section 9.2)
  const [notifications, setNotifications] = useState<OwnerNotification[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState<string | null>(null);
  const [isGCalConnected, setIsGCalConnected] = useState<boolean>(!!getStoredGCalToken());
  const [gcalFeedback, setGcalFeedback] = useState<string | null>(null);

  // Order Details Modal / Drawer
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [ownerNote, setOwnerNote] = useState('');

  // Archive Confirmation Modal (Section 10)
  const [archiveModalOrder, setArchiveModalOrder] = useState<Order | null>(null);

  // Customer Management State (Section 9 & 16.1)
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFeedback, setCustomerFeedback] = useState<string | null>(null);

  // Safety check for notifications (FIX 1)
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  // Filtered Orders for Dashboard (FIX 6 & FIX 7)
  const filteredOrders = orders.filter((o) => {
    // 1. Tab check: archived tab vs active orders tab
    const isArchived = Boolean(o.is_archived || (o as any).archived || o.order_status === 'Archived');
    if (activeTab === 'archived' && !isArchived) return false;
    if (activeTab === 'orders' && isArchived && statusFilter !== 'Archived') return false;

    // 2. Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'Archived') {
        if (!isArchived) return false;
      } else if (o.order_status !== statusFilter) {
        return false;
      }
    }

    // 3. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = (o.order_id || '').toLowerCase().includes(q);
      const matchName = (o.customer?.full_name || '').toLowerCase().includes(q);
      const matchEmail = (o.customer?.email || '').toLowerCase().includes(q);
      const matchPhone = (o.customer?.phone_number || '').toLowerCase().includes(q);
      const matchProduct = (o.product?.product_name || '').toLowerCase().includes(q);
      const matchItem = (o.item_requested || '').toLowerCase().includes(q);

      if (!matchId && !matchName && !matchEmail && !matchPhone && !matchProduct && !matchItem) {
        return false;
      }
    }

    return true;
  });

  // Setup Real-time Firestore Listeners for Orders, Products, and Inventory
  useEffect(() => {
    if (!ownerSession) return;
    setIsLoading(true);

    const unsubOrders = subscribeToOrders((allOrders) => {
      const isArchived = (o: Order) => Boolean(o.is_archived || (o as any).archived || o.order_status === 'Archived');
      const active = allOrders.filter((o) => !isArchived(o));
      const archived = allOrders.filter((o) => isArchived(o));

      setCounts({
        total_active: active.length,
        pending_quotes: active.filter((o) => o.order_status === 'Pending Quote').length,
        awaiting_payment: active.filter((o) => o.order_status === 'Awaiting Payment' || o.order_status === 'Quote Sent').length,
        pending_verification: active.filter((o) => o.order_status === 'Pending Verification' || o.payment_status === 'Pending Verification').length,
        paid: active.filter((o) => o.payment_status === 'Verified' || o.order_status === 'Paid').length,
        in_progress: active.filter((o) => o.order_status === 'In Progress').length,
        completed: active.filter((o) => o.order_status === 'Completed').length,
        cancelled: active.filter((o) => o.order_status === 'Cancelled').length,
        archived: archived.length
      });

      setOrders(allOrders);
      setIsLoading(false);

      setSelectedOrder((prev) => {
        if (!prev) return null;
        return allOrders.find((o) => o.order_id === prev.order_id) || prev;
      });
    });

    const unsubProducts = subscribeToProducts((prods) => {
      setProductsList(prods);
    });

    const unsubInventory = subscribeToInventory((inv) => {
      setInventoryList(inv);
    });

    const unsubNotifications = subscribeToNotifications((notifs) => {
      setNotifications(Array.isArray(notifs) ? notifs : []);
    });

    // Auxiliaries
    fetchOwnerNotifications()
      .then((res: any) => {
        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.notifications)
          ? res.notifications
          : [];
        if (list.length > 0) {
          setNotifications((prev) => (Array.isArray(prev) && prev.length > 0 ? prev : list));
        }
      })
      .catch(() => {});
    fetchOwnerCalendar().then((res: any) => {
      const evts = Array.isArray(res) ? res : Array.isArray(res?.events) ? res.events : [];
      setCalendarEvents(evts);
    }).catch(() => {});
    fetchOwnerSettings().then((res: any) => {
      if (res && typeof res === 'object') {
        setBusinessSettings(res.settings || res);
      }
    }).catch(() => {});

    return () => {
      unsubOrders();
      unsubProducts();
      unsubInventory();
      unsubNotifications();
    };
  }, [ownerSession]);

  const loadData = async () => {
    if (!ownerSession) return;
    if (activeTab === 'customers') {
      try {
        const cData = await fetchOwnerCustomers();
        setCustomersList(cData.customers);
      } catch (err) {
        console.warn('Customer load err:', err);
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'customers') {
      loadData();
    }
  }, [activeTab]);

  const handleMarkNotification = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => (Array.isArray(prev) ? prev.map(n => n.id === id ? { ...n, read: true } : n) : []));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setSettingsSavedMessage(null);
    try {
      const updated = await updateOwnerSettings(businessSettings);
      setBusinessSettings(updated.settings);
      setSettingsSavedMessage('Business settings saved successfully.');
      setTimeout(() => setSettingsSavedMessage(null), 4000);
    } catch (err: any) {
      setSettingsSavedMessage('Failed to save settings: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    setGcalFeedback(null);
    try {
      await requestGoogleCalendarAccess();
      setIsGCalConnected(true);
      setGcalFeedback('Successfully connected to Google Calendar!');
      setTimeout(() => setGcalFeedback(null), 4000);
    } catch (err: any) {
      setGcalFeedback(err.message || 'Google Calendar connection failed.');
    }
  };

  const handleDisconnectGoogleCalendar = () => {
    clearGCalToken();
    setIsGCalConnected(false);
    setGcalFeedback('Disconnected from Google Calendar.');
    setTimeout(() => setGcalFeedback(null), 3000);
  };

  // 1. Verify Payment (Section 6 & 9)
  const handleVerifyPayment = async (orderId: string) => {
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const updated = await verifyPaymentInFirestore(orderId, ownerSession?.email || 'Owner');
      // Trigger calendar synchronization only here (FIX 13)
      try {
        await syncOrderToGoogleCalendar(updated, businessSettings.calendar_sync_enabled);
      } catch (calErr) {
        console.warn('Calendar sync notice:', calErr);
      }
      setActionFeedback(`Payment verified! Order ${orderId} changed to Paid.`);
      setSelectedOrder(updated);
    } catch (err: any) {
      setActionFeedback(err.message || 'Failed to verify payment.');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Lifecycle Status Update (Section 9 & 17)
  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const updated = await updateOrderStatusInFirestore(orderId, nextStatus, ownerNote);
      setActionFeedback(`Order milestone updated to ${nextStatus}.`);
      setSelectedOrder(updated);
      setOwnerNote('');
    } catch (err: any) {
      setActionFeedback(err.message || 'Failed to update order status.');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Archive Order with Mandatory Confirmation (Section 10)
  const handleConfirmArchive = async () => {
    if (!archiveModalOrder) return;
    setActionLoading(true);
    try {
      await archiveOrderInFirestore(archiveModalOrder.order_id, true);
      setArchiveModalOrder(null);
      if (selectedOrder?.order_id === archiveModalOrder.order_id) {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to archive order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnarchive = async (orderId: string) => {
    setActionLoading(true);
    try {
      await archiveOrderInFirestore(orderId, false);
    } catch (err: any) {
      alert(err.message || 'Failed to unarchive order.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Delete Product
  const handleDeleteProduct = async (productId: string, prodName: string) => {
    if (!confirm(`Are you sure you want to remove "${prodName}" from the database?`)) {
      return;
    }
    try {
      await deleteProductInFirestore(productId);
    } catch (err: any) {
      alert('Failed to delete product: ' + err.message);
    }
  };

  // 6. POPIA Anonymize Customer Data (Section 16.1)
  const handleAnonymizeCustomer = async (custId: string) => {
    if (!confirm('POPIA Compliance: Are you sure you want to permanently anonymize this customer record? All personal identifiers will be removed.')) {
      return;
    }
    try {
      const res = await anonymizeCustomerPII(custId);
      setCustomerFeedback(res.message);
      const cData = await fetchOwnerCustomers();
      setCustomersList(cData.customers);
    } catch (err: any) {
      setCustomerFeedback(err.message || 'Failed to anonymize customer.');
    }
  };

  if (!ownerSession) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Top Banner with Owner Greeting & Access Control badge */}
      <div className="bg-white rounded-2xl border border-[#EDE7F8] p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EDE7F8] text-[#6B4FA1] border border-[#B9A7E8]/40 flex items-center justify-center font-bold shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#302A38]">Owner Dashboard</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EDE7F8] text-[#6B4FA1] border border-[#B9A7E8]/40">
                Authorised Owner
              </span>
            </div>
            <p className="text-xs text-[#6B4FA1] mt-0.5">
              Logged in as <strong>{ownerSession.name}</strong> ({ownerSession.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#F8F6FC] hover:bg-[#EDE7F8] text-[#6B4FA1] rounded-xl text-xs font-semibold border border-[#EDE7F8] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh DB</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      {(() => {
        const unreadNotifsCount = safeNotifications.filter(n => !n.read).length;
        const lowStockProducts = productsList.filter(p => p.stock_quantity < 5);
        const lowMaterialsCount = inventoryList.filter(i => i.quantity <= i.min_threshold).length;
        const specialColourOrders = orders.filter(o => o.is_special_colour && o.order_status !== 'Completed' && o.order_status !== 'Cancelled');

        return (
          <div className="flex flex-wrap gap-2 border-b border-[#EDE7F8] pb-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-[#6B4FA1] text-white shadow-xs'
                  : 'text-[#302A38]/70 hover:bg-[#EDE7F8] hover:text-[#302A38]'
              }`}
            >
              <span>Overview</span>
              {(lowStockProducts.length > 0 || lowMaterialsCount > 0 || specialColourOrders.length > 0) && (
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'orders'
                  ? 'bg-[#6B4FA1] text-white shadow-xs'
                  : 'text-[#302A38]/70 hover:bg-[#EDE7F8] hover:text-[#302A38]'
              }`}
            >
              <span>Orders Management</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {counts.total_active}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('verification')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'verification'
                  ? 'bg-[#6B4FA1] text-white shadow-xs'
                  : 'text-[#302A38]/70 hover:bg-[#EDE7F8] hover:text-[#302A38]'
              }`}
            >
              <span>Payment Verification</span>
              {counts.pending_verification > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#B9A7E8] text-[#302A38]">
                  {counts.pending_verification}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'inventory'
                  ? 'bg-[#6B4FA1] text-white shadow-xs'
                  : 'text-[#302A38]/70 hover:bg-[#EDE7F8] hover:text-[#302A38]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Raw Materials</span>
              {lowMaterialsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {lowMaterialsCount} low
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'products'
                  ? 'bg-[#6B4FA1] text-white shadow-xs'
                  : 'text-[#302A38]/70 hover:bg-[#EDE7F8] hover:text-[#302A38]'
              }`}
            >
              <span>Products & Quick Order</span>
              {lowStockProducts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                  {lowStockProducts.length} low
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'notifications'
                  ? 'bg-[#6B4FA1] text-white shadow-xs'
                  : 'text-[#302A38]/70 hover:bg-[#EDE7F8] hover:text-[#302A38]'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Notifications</span>
              {unreadNotifsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'calendar'
                  ? 'bg-[#6B4FA1] text-white shadow-xs'
                  : 'text-[#302A38]/70 hover:bg-[#EDE7F8] hover:text-[#302A38]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Milestones Calendar</span>
              {calendarEvents.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                  {calendarEvents.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'customers'
                  ? 'bg-[#6B4FA1] text-white shadow-xs'
                  : 'text-[#302A38]/70 hover:bg-[#EDE7F8] hover:text-[#302A38]'
              }`}
            >
              <span>Customer Records</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-[#6B4FA1] text-white shadow-xs'
                  : 'text-[#302A38]/70 hover:bg-[#EDE7F8] hover:text-[#302A38]'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('archived')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'archived'
                  ? 'bg-[#6B4FA1] text-white shadow-xs'
                  : 'text-[#302A38]/70 hover:bg-[#EDE7F8] hover:text-[#302A38]'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archived Orders</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {counts.archived}
              </span>
            </button>
          </div>
        );
      })()}

      {/* ==================================================== */}
      {/* 1. OVERVIEW METRICS & ALERTS (Section 9 & 9.1) */}
      {/* ==================================================== */}
      {activeTab === 'overview' && (() => {
        const lowStockProducts = productsList.filter(p => p.stock_quantity < 5);
        const specialColourOrders = orders.filter(o => o.is_special_colour && o.order_status !== 'Completed' && o.order_status !== 'Cancelled');
        const recentNotifs = safeNotifications.slice(0, 3);

        return (
          <div className="space-y-6">
            {/* Section 9.1: Low Stock Visual Alert (< 5 units) */}
            {lowStockProducts.length > 0 && (
              <div className="bg-amber-50/90 border-2 border-amber-300/80 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide flex items-center gap-2">
                        Low Stock Alert (Units &lt; 5)
                      </h3>
                      <p className="text-xs text-amber-900/80">
                        {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's have' : ' has'} dropped below 5 units. Replenish yarn or bead supply to prevent order delays.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('products')}
                    className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 text-xs font-bold rounded-xl transition"
                  >
                    Manage Inventory →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  {lowStockProducts.map((p) => (
                    <div
                      key={p.product_id}
                      className="bg-white p-3 rounded-xl border border-amber-200/80 flex items-center justify-between shadow-2xs"
                    >
                      <div>
                        <div className="font-bold text-xs text-[#302A38]">{p.product_name}</div>
                        <div className="text-[11px] text-amber-800 font-semibold mt-0.5">
                          {p.stock_quantity} remaining in database
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedProductForEdit(p);
                          setShowProductManagerModal(true);
                          setActiveTab('products');
                        }}
                        className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold rounded-lg transition"
                      >
                        Edit Stock
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 9.1: Special Colour / Custom Sourcing Alerts */}
            {specialColourOrders.length > 0 && (
              <div className="bg-orange-50/90 border-2 border-orange-300/80 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-100 rounded-xl text-orange-800">
                      <Palette className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-orange-950 uppercase tracking-wide flex items-center gap-2">
                        Special Colour Sourcing Buffer Alert
                      </h3>
                      <p className="text-xs text-orange-900/80">
                        {specialColourOrders.length} active order{specialColourOrders.length > 1 ? 's have' : ' has'} requested custom colours with a mandatory +4-day sourcing buffer.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="px-3 py-1.5 bg-orange-200 hover:bg-orange-300 text-orange-950 text-xs font-bold rounded-xl transition"
                  >
                    View Active Orders →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {specialColourOrders.map((o) => (
                    <div
                      key={o.order_id}
                      className="bg-white p-3 rounded-xl border border-orange-200/80 flex items-center justify-between shadow-2xs"
                    >
                      <div>
                        <div className="font-bold text-xs text-[#302A38] flex items-center gap-1.5">
                          <span className="font-mono">{o.order_id}</span>
                          <span className="text-[#302A38]/60 font-normal">({o.customer.full_name})</span>
                        </div>
                        <div className="text-[11px] text-orange-800 font-medium mt-0.5">
                          Custom Colour: <strong>{o.colour}</strong> • Due: {o.estimated_completion_date ? new Date(o.estimated_completion_date).toLocaleDateString() : 'TBD'}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-900 text-[11px] font-bold rounded-lg transition"
                      >
                        Manage
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#EDE7F8] shadow-xs">
                <span className="text-[11px] font-bold uppercase text-[#302A38]/60 tracking-wider">
                  Total Active Orders
                </span>
                <div className="text-3xl font-black text-[#302A38] mt-1">{counts.total_active}</div>
                <p className="text-[11px] text-[#6B4FA1] mt-1">Live in persistent database</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-purple-200 bg-purple-50/40 shadow-xs">
                <span className="text-[11px] font-bold uppercase text-purple-900 tracking-wider">
                  Awaiting Verification
                </span>
                <div className="text-3xl font-black text-[#6B4FA1] mt-1">
                  {counts.pending_verification}
                </div>
                <p className="text-[11px] text-purple-700 mt-1">Proof uploaded by customers</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs">
                <span className="text-[11px] font-bold uppercase text-amber-900 tracking-wider">
                  Awaiting Payment
                </span>
                <div className="text-3xl font-black text-amber-900 mt-1">{counts.awaiting_payment}</div>
                <p className="text-[11px] text-amber-700 mt-1">Quote accepted by customer</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-xs">
                <span className="text-[11px] font-bold uppercase text-blue-900 tracking-wider">
                  In Progress
                </span>
                <div className="text-3xl font-black text-blue-900 mt-1">{counts.in_progress}</div>
                <p className="text-[11px] text-blue-700 mt-1">Currently being crafted</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
                <span className="text-[11px] font-bold uppercase text-emerald-900 tracking-wider">
                  Completed
                </span>
                <div className="text-3xl font-black text-emerald-900 mt-1">{counts.completed}</div>
                <p className="text-[11px] text-emerald-700 mt-1">Fulfilled and delivered</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-xs">
                <span className="text-[11px] font-bold uppercase text-rose-900 tracking-wider">
                  Cancelled
                </span>
                <div className="text-3xl font-black text-rose-900 mt-1">{counts.cancelled}</div>
                <p className="text-[11px] text-rose-700 mt-1">Items returned to stock</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#EDE7F8] shadow-xs">
                <span className="text-[11px] font-bold uppercase text-[#302A38]/60 tracking-wider">
                  Pending Quotes
                </span>
                <div className="text-3xl font-black text-[#302A38] mt-1">{counts.pending_quotes}</div>
                <p className="text-[11px] text-[#6B4FA1] mt-1">Awaiting customer acceptance</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#EDE7F8] shadow-xs">
                <span className="text-[11px] font-bold uppercase text-[#302A38]/60 tracking-wider">
                  Archived Records
                </span>
                <div className="text-3xl font-black text-[#302A38] mt-1">{counts.archived}</div>
                <p className="text-[11px] text-[#6B4FA1] mt-1">Retained permanently in DB</p>
              </div>
            </div>

            {/* Quick FNB Business Information Display */}
            <div className="bg-white p-6 rounded-2xl border border-[#EDE7F8] shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-[#302A38] uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#6B4FA1]" />
                Configured FNB Merchant Account
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-[#F8F6FC] rounded-xl border border-[#EDE7F8]">
                  <span className="text-[10px] text-[#302A38]/60 uppercase block">Bank</span>
                  <span className="font-bold text-[#302A38]">{FNB_BANKING_DETAILS.bankName}</span>
                </div>
                <div className="p-3 bg-[#F8F6FC] rounded-xl border border-[#EDE7F8]">
                  <span className="text-[10px] text-[#302A38]/60 uppercase block">Account Holder</span>
                  <span className="font-bold text-[#302A38]">{FNB_BANKING_DETAILS.accountName}</span>
                </div>
                <div className="p-3 bg-[#F8F6FC] rounded-xl border border-[#EDE7F8]">
                  <span className="text-[10px] text-[#302A38]/60 uppercase block">Account Number</span>
                  <span className="font-mono font-bold text-[#302A38]">{FNB_BANKING_DETAILS.accountNumber}</span>
                </div>
                <div className="p-3 bg-[#F8F6FC] rounded-xl border border-[#EDE7F8]">
                  <span className="text-[10px] text-[#302A38]/60 uppercase block">Branch Code</span>
                  <span className="font-mono font-bold text-[#302A38]">{FNB_BANKING_DETAILS.branchCode}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================================================== */}
      {/* 2. ORDERS MANAGEMENT TABLE (Section 9) */}
      {/* ==================================================== */}
      {(activeTab === 'orders' || activeTab === 'archived') && (
        <div className="space-y-4">
          {/* Search & Status Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#EDE7F8] shadow-xs flex flex-wrap items-center justify-between gap-3">
            <form onSubmit={(e) => e.preventDefault()} className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-[#6B4FA1] absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Order ID, customer name, email..."
                className="w-full bg-[#F8F6FC] border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl pl-9 pr-3 py-2 text-xs text-[#302A38] focus:outline-none"
              />
            </form>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#6B4FA1]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#F8F6FC] border border-[#EDE7F8] text-[#302A38] text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="Pending Quote">Pending Quote</option>
                <option value="Quote Sent">Quote Sent</option>
                <option value="Awaiting Payment">Awaiting Payment</option>
                <option value="Pending Verification">Pending Verification</option>
                <option value="Paid">Paid</option>
                <option value="In Progress">In Progress</option>
                <option value="Ready for Collection">Ready for Collection</option>
                <option value="Ready for Delivery">Ready for Delivery</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-[#EDE7F8] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F6FC] text-[#302A38]/70 border-b border-[#EDE7F8] uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="px-5 py-3.5">Order ID</th>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Item & Qty</th>
                    <th className="px-5 py-3.5">Amount (ZAR)</th>
                    <th className="px-5 py-3.5">Order Status</th>
                    <th className="px-5 py-3.5">Payment</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDE7F8]">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-[#302A38]/50 text-xs">
                        No orders match the current filter or search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => (
                      <tr key={o.order_id} className="hover:bg-[#F8F6FC]/60 transition">
                        <td className="px-5 py-3.5 font-mono font-bold text-[#302A38]">
                          <div>{o.order_id}</div>
                          {(o.is_quick_order || o.order_type === 'quick') && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-md mt-1">
                              <Zap className="w-2.5 h-2.5 text-amber-700" />
                              Quick Order
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-[#302A38]">{o.customer.full_name}</div>
                          <div className="text-[11px] text-[#302A38]/60 font-mono">{o.customer.phone_number}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-[#302A38]">{o.product.product_name}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-[#6B4FA1] font-semibold">Qty: {o.quantity}</span>
                            {o.colour && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EDE7F8] text-[#6B4FA1]">
                                {o.colour}
                              </span>
                            )}
                            {o.is_special_colour && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                Special (+4d)
                              </span>
                            )}
                          </div>
                          {o.estimated_completion_date && (
                            <div className="text-[10px] text-[#302A38]/60 mt-0.5 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              <span>Due: {new Date(o.estimated_completion_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-[#302A38]">
                          R{o.quoted_amount.toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EDE7F8] text-[#6B4FA1] border border-[#B9A7E8]/40">
                            {o.order_status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              o.payment_status === 'Verified'
                                ? 'bg-emerald-50 text-emerald-800'
                                : o.payment_status === 'Pending Verification'
                                ? 'bg-purple-100 text-purple-900 font-bold'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {o.payment_status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {o.order_status === 'Pending Quote' && (
                            <button
                              onClick={() => {
                                setOrderForQuoteModal(o);
                                setShowQuoteModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-[#6B4FA1] text-white hover:bg-[#5A3F8C] rounded-lg font-bold text-[11px] transition shadow-xs"
                            >
                              Send Quote
                            </button>
                          )}
                          {(o.order_status === 'Pending Verification' || o.payment_status === 'Pending Verification') && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleVerifyPayment(o.order_id)}
                              className="px-2.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-bold text-[11px] transition shadow-xs disabled:opacity-50"
                            >
                              Verify Payment
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="px-2.5 py-1.5 bg-[#EDE7F8] text-[#6B4FA1] hover:bg-[#B9A7E8]/40 rounded-lg font-bold text-[11px] transition"
                          >
                            Manage
                          </button>
                          {activeTab === 'archived' ? (
                            <button
                              onClick={() => handleUnarchive(o.order_id)}
                              className="px-2.5 py-1.5 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-lg font-medium text-[11px] transition"
                              title="Restore to active view"
                            >
                              Unarchive
                            </button>
                          ) : (
                            <button
                              onClick={() => setArchiveModalOrder(o)}
                              className="px-2 py-1.5 text-[#302A38]/50 hover:text-red-600 rounded-lg text-[11px] transition"
                              title="Archive order"
                            >
                              Archive
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. PAYMENT VERIFICATION QUEUE (Section 6 & 9) */}
      {/* ==================================================== */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#EDE7F8] rounded-2xl border border-[#B9A7E8]/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#6B4FA1] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#6B4FA1]" />
                FNB Payment Verification Queue
              </h3>
              <p className="text-xs text-[#302A38]/80 mt-0.5">
                Inspect bank transfer references submitted by customers and verify deposits into Ms Roseane's FNB account.
              </p>
            </div>
            <span className="text-xs font-bold text-[#6B4FA1] bg-white px-3 py-1 rounded-full border border-[#B9A7E8]/50">
              {orders.filter((o) => o.order_status === 'Pending Verification').length} pending
            </span>
          </div>

          <div className="space-y-3">
            {orders
              .filter((o) => o.order_status === 'Pending Verification')
              .map((o) => (
                <div
                  key={o.order_id}
                  className="bg-white p-5 rounded-2xl border border-[#EDE7F8] shadow-xs flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#302A38]">{o.order_id}</span>
                      <span className="text-xs font-semibold text-[#6B4FA1]">• {o.customer.full_name}</span>
                    </div>
                    <p className="text-xs text-[#302A38]/70">
                      Item: <strong>{o.product.product_name}</strong> (Qty: {o.quantity}) • Amount: <strong>R{o.quoted_amount.toFixed(2)}</strong>
                    </p>
                    <div className="p-2.5 bg-[#F8F6FC] rounded-xl border border-[#EDE7F8] text-xs font-mono text-[#302A38] inline-block">
                      Bank Ref: <strong>{o.payment_details.proof_of_payment?.reference_number || 'N/A'}</strong> | Payer: {o.payment_details.proof_of_payment?.payer_name || o.customer.full_name}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedOrder(o)}
                      className="px-3 py-2 text-xs font-semibold text-[#6B4FA1] hover:bg-[#EDE7F8] rounded-xl transition"
                    >
                      View Details
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleVerifyPayment(o.order_id)}
                      className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Verify Deposit (Mark Paid)</span>
                    </button>
                  </div>
                </div>
              ))}

            {orders.filter((o) => o.order_status === 'Pending Verification').length === 0 && (
              <div className="bg-white p-12 text-center rounded-2xl border border-[#EDE7F8] text-[#302A38]/60 text-xs">
                <CheckCircle2 className="w-8 h-8 text-[#6B4FA1] mx-auto mb-2 opacity-60" />
                All submitted payments have been verified. No pending items in FNB queue.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4A. RAW MATERIALS & INVENTORY MANAGEMENT */}
      {/* ==================================================== */}
      {activeTab === 'inventory' && (
        <InventorySection inventory={inventoryList} products={productsList} />
      )}

      {/* ==================================================== */}
      {/* 4B. PRODUCTS & QUICK ORDER MANAGEMENT */}
      {/* ==================================================== */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#EDE7F8] shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#302A38]">Catalogue & Quick Order Products</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#EDE7F8] text-[#6B4FA1]">
                  {productsList.length} total
                </span>
              </div>
              <p className="text-xs text-[#302A38]/70 mt-1">
                Synced directly with Firestore. All items immediately appear in the customer shop and order forms.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedProductForEdit(null);
                setShowProductManagerModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#6B4FA1] text-white hover:bg-[#6B4FA1]/90 rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productsList.map((p) => {
              const isLow = p.stock_quantity > 0 && p.stock_quantity < 5;
              const isOut = p.stock_quantity <= 0;
              const isQuick = p.is_quick_order !== false;

              return (
                <div
                  key={p.product_id}
                  className="bg-white rounded-2xl border border-[#EDE7F8] hover:border-[#B9A7E8] transition p-5 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <img
                        src={p.image_url}
                        alt={p.product_name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-xl object-cover border border-[#EDE7F8]"
                      />
                      <div className="text-right">
                        <span className="text-xs font-mono text-[#6B4FA1] bg-[#EDE7F8] px-2 py-0.5 rounded">
                          {p.product_id}
                        </span>
                        <span className="block text-[11px] text-[#302A38]/60 mt-1 font-semibold">
                          {p.category}
                        </span>
                        {isQuick && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 mt-1">
                            <Zap className="w-2.5 h-2.5 text-amber-700" />
                            Quick Order
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#302A38]">{p.product_name}</h4>
                        {p.is_featured && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-[#6B4FA1]">
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#302A38]/70 mt-1 line-clamp-2">{p.description}</p>
                    </div>

                    {/* Linked raw materials preview */}
                    {p.materials_used && p.materials_used.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[10px] uppercase font-semibold text-[#302A38]/50 block">
                          Linked Materials:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {p.materials_used.map((m) => (
                            <span
                              key={m.material_id}
                              className="text-[10px] px-1.5 py-0.5 bg-[#F8F6FC] border border-[#EDE7F8] rounded text-[#302A38]/70"
                            >
                              {m.material_name} ({m.quantity_per_unit} {m.unit})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-[#F8F6FC] rounded-xl border border-[#EDE7F8] flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-[#302A38]/60 uppercase block">DB Price</span>
                        <span className="font-bold text-base text-[#302A38]">R{p.price.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#302A38]/60 uppercase block">Stock Count</span>
                        <span
                          className={`font-bold ${
                            isOut
                              ? 'text-rose-600'
                              : isLow
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {p.stock_quantity} units
                        </span>
                        <span className="block text-[10px] text-[#302A38]/50 font-medium">
                          {p.availability_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#EDE7F8] flex items-center justify-between">
                    <button
                      onClick={() => handleDeleteProduct(p.product_id, p.product_name)}
                      className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedProductForEdit(p);
                        setShowProductManagerModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EDE7F8] text-[#6B4FA1] hover:bg-[#B9A7E8]/40 rounded-xl text-xs font-bold transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. CUSTOMER RECORDS & POPIA COMPLIANCE (Section 9 & 16.1) */}
      {/* ==================================================== */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#EDE7F8] shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#302A38]">Customer Records (POPIA Protected)</h3>
              <p className="text-xs text-[#302A38]/70">
                Authorised business owner view of customer contact records and order history.
              </p>
            </div>
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search customer name or phone..."
              className="bg-[#F8F6FC] border border-[#EDE7F8] rounded-xl px-3 py-1.5 text-xs text-[#302A38] focus:outline-none"
            />
          </div>

          {customerFeedback && (
            <div className="p-3 bg-[#EDE7F8] text-[#6B4FA1] border border-[#B9A7E8] rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{customerFeedback}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-[#EDE7F8] shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F6FC] text-[#302A38]/70 border-b border-[#EDE7F8] uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3">Customer ID</th>
                  <th className="px-5 py-3">Full Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Total Orders</th>
                  <th className="px-5 py-3">Total Spent</th>
                  <th className="px-5 py-3 text-right">POPIA Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDE7F8]">
                {customersList
                  .filter(
                    (c) =>
                      !customerSearch ||
                      c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                      c.phone_number.includes(customerSearch)
                  )
                  .map((cust) => (
                    <tr key={cust.customer_id} className="hover:bg-[#F8F6FC]/60 transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-[#302A38]">
                        {cust.customer_id}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-[#302A38]">
                        {cust.full_name}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[#302A38]/80">
                        {cust.email}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[#302A38]/80">
                        {cust.phone_number}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-[#6B4FA1]">
                        {cust.order_count || 0}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-[#302A38]">
                        R{(cust.total_spent_zar || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleAnonymizeCustomer(cust.customer_id)}
                          className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-[11px] font-semibold transition"
                          title="Anonymize personal data in compliance with POPIA retention policy"
                        >
                          Anonymize PII
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* NOTIFICATIONS TAB (Section 9.2) */}
      {/* ==================================================== */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-[#EDE7F8] p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EDE7F8]">
            <div>
              <h2 className="text-sm font-black text-[#302A38] uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#6B4FA1]" />
                Owner Notification Stream
              </h2>
              <p className="text-xs text-[#302A38]/70 mt-0.5">
                Triggered automatically when customers upload proof of payment and accept orders.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-full bg-[#EDE7F8] text-[#6B4FA1]">
                Total: {safeNotifications.length}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold">
                Unread: {safeNotifications.filter((n) => !n.read).length}
              </span>
            </div>
          </div>

          {safeNotifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#302A38]/60 space-y-2">
              <Bell className="w-8 h-8 text-[#6B4FA1] mx-auto opacity-40" />
              <p className="font-semibold">No notifications recorded yet.</p>
              <p className="text-[11px]">
                When a customer uploads proof of payment or confirms an order, an alert will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#EDE7F8]">
              {safeNotifications.map((notif) => {
                const relatedOrder = orders.find((o) => o.order_id === notif.order_id);
                return (
                  <div
                    key={notif.id}
                    className={`py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition ${
                      !notif.read ? 'bg-purple-50/50 -mx-6 px-6' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#302A38]">{notif.title || notif.subject}</span>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-amber-500" title="Unread"></span>
                        )}
                        <span className="text-[10px] text-[#302A38]/50">
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-[#302A38]/80 leading-relaxed">{notif.message || notif.subject}</p>
                      {notif.order_id && (
                        <div className="text-[11px] font-mono font-bold text-[#6B4FA1]">
                          Ref Order: {notif.order_id}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {relatedOrder && (
                        <button
                          onClick={() => setSelectedOrder(relatedOrder)}
                          className="px-3 py-1.5 bg-[#EDE7F8] hover:bg-[#B9A7E8]/40 text-[#6B4FA1] rounded-xl text-xs font-bold transition"
                        >
                          View Order
                        </button>
                      )}
                      {!notif.read && (
                        <button
                          onClick={() => handleMarkNotification(notif.id)}
                          className="px-3 py-1.5 border border-[#EDE7F8] hover:bg-[#F8F6FC] text-[#302A38] rounded-xl text-xs font-semibold transition"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* CALENDAR & MILESTONES TAB (Section 9.2) */}
      {/* ==================================================== */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-2xl border border-[#EDE7F8] p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EDE7F8]">
            <div>
              <h2 className="text-sm font-black text-[#302A38] uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#6B4FA1]" />
                Handcrafting & Delivery Schedule
              </h2>
              <p className="text-xs text-[#302A38]/70 mt-0.5">
                Automatically calculated completion dates and delivery milestones across all active orders.
              </p>
            </div>
            <div className="text-xs font-bold text-[#6B4FA1] bg-[#EDE7F8] px-3 py-1 rounded-full">
              {calendarEvents.length} Scheduled Milestones
            </div>
          </div>

          {calendarEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#302A38]/60 space-y-2">
              <Calendar className="w-8 h-8 text-[#6B4FA1] mx-auto opacity-40" />
              <p className="font-semibold">No upcoming delivery events recorded.</p>
              <p className="text-[11px]">
                Orders with confirmed payment proof automatically generate calendar milestones.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {calendarEvents.map((evt) => {
                const targetOrder = orders.find((o) => o.order_id === evt.order_id);
                return (
                  <div
                    key={evt.id}
                    className="p-4 rounded-2xl border border-[#EDE7F8] bg-[#F8F6FC] hover:border-[#B9A7E8] transition space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-[#6B4FA1] bg-white px-2 py-0.5 rounded-lg border border-[#EDE7F8]">
                        {evt.order_id}
                      </span>
                      <span className="text-[11px] font-bold text-[#302A38] bg-white px-2.5 py-0.5 rounded-full border border-[#EDE7F8]">
                        📅 {new Date(evt.scheduled_date || evt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-[#302A38]">{evt.title}</h4>
                      <p className="text-xs text-[#302A38]/70 mt-1 leading-relaxed">{evt.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#EDE7F8]">
                      <span className="text-[11px] text-[#302A38]/60">
                        Customer: <strong>{evt.customer_name}</strong>
                      </span>
                      {targetOrder && (
                        <button
                          onClick={() => setSelectedOrder(targetOrder)}
                          className="px-2.5 py-1 bg-white hover:bg-[#EDE7F8] text-[#6B4FA1] border border-[#EDE7F8] rounded-lg text-xs font-bold transition"
                        >
                          Manage Order
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* SETTINGS TAB (Section 9.2) */}
      {/* ==================================================== */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-[#EDE7F8] p-6 shadow-xs space-y-6 max-w-2xl">
          <div className="pb-3 border-b border-[#EDE7F8]">
            <h2 className="text-sm font-black text-[#302A38] uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#6B4FA1]" />
              Business Notification & Integration Settings
            </h2>
            <p className="text-xs text-[#302A38]/70 mt-0.5">
              Configure how you receive order confirmations and calendar updates.
            </p>
          </div>

          {settingsSavedMessage && (
            <div className="p-3 bg-[#EDE7F8] text-[#6B4FA1] border border-[#B9A7E8] rounded-xl text-xs font-bold">
              {settingsSavedMessage}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
            <div className="space-y-1">
              <label className="block font-bold text-[#302A38]">Authorised Notification Email</label>
              <input
                type="email"
                required
                value={businessSettings.owner_email}
                onChange={(e) =>
                  setBusinessSettings({ ...businessSettings, owner_email: e.target.value })
                }
                className="w-full bg-[#F8F6FC] border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none"
              />
              <p className="text-[11px] text-[#302A38]/60">
                Email address where order and payment notifications will be dispatched.
              </p>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#EDE7F8]">
              <h3 className="font-bold text-[#302A38] uppercase text-[11px] tracking-wide">
                Automated Notification Triggers (Section 9.2)
              </h3>

              <label className="flex items-start gap-3 p-3 bg-[#F8F6FC] rounded-xl border border-[#EDE7F8] cursor-pointer">
                <input
                  type="checkbox"
                  checked={businessSettings.notify_on_payment_proof}
                  onChange={(e) =>
                    setBusinessSettings({
                      ...businessSettings,
                      notify_on_payment_proof: e.target.checked
                    })
                  }
                  className="mt-0.5 rounded text-[#6B4FA1] focus:ring-[#6B4FA1]"
                />
                <div>
                  <span className="font-bold text-[#302A38] block">
                    Customer Payment Proof Upload Alert
                  </span>
                  <span className="text-[11px] text-[#302A38]/70">
                    Immediately notify owner when customer submits FNB proof of payment slip.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-[#F8F6FC] rounded-xl border border-[#EDE7F8] cursor-pointer">
                <input
                  type="checkbox"
                  checked={businessSettings.notify_on_order_confirmed}
                  onChange={(e) =>
                    setBusinessSettings({
                      ...businessSettings,
                      notify_on_order_confirmed: e.target.checked
                    })
                  }
                  className="mt-0.5 rounded text-[#6B4FA1] focus:ring-[#6B4FA1]"
                />
                <div>
                  <span className="font-bold text-[#302A38] block">
                    Order Confirmation & Quote Acceptance Alert
                  </span>
                  <span className="text-[11px] text-[#302A38]/70">
                    Notify owner whenever a customer creates an order or accepts a quotation.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-[#F8F6FC] rounded-xl border border-[#EDE7F8] cursor-pointer">
                <input
                  type="checkbox"
                  checked={businessSettings.calendar_reminders}
                  onChange={(e) =>
                    setBusinessSettings({
                      ...businessSettings,
                      calendar_reminders: e.target.checked
                    })
                  }
                  className="mt-0.5 rounded text-[#6B4FA1] focus:ring-[#6B4FA1]"
                />
                <div>
                  <span className="font-bold text-[#302A38] block">
                    Automated Milestone Scheduling
                  </span>
                  <span className="text-[11px] text-[#302A38]/70">
                    Automatically create calendar events for estimated delivery dates upon payment confirmation.
                  </span>
                </div>
              </label>

              <div className="p-3 bg-[#F8F6FC] rounded-xl border border-[#EDE7F8] space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={businessSettings.google_calendar_sync}
                    onChange={(e) =>
                      setBusinessSettings({
                        ...businessSettings,
                        google_calendar_sync: e.target.checked
                      })
                    }
                    className="mt-0.5 rounded text-[#6B4FA1] focus:ring-[#6B4FA1]"
                  />
                  <div>
                    <span className="font-bold text-[#302A38] block">
                      Google Calendar Integration Sync
                    </span>
                    <span className="text-[11px] text-[#302A38]/70">
                      Create calendar events for confirmed orders on the Business Owner's calendar.
                    </span>
                  </div>
                </label>

                {/* Live Google Account OAuth Connection Control */}
                <div className="pt-2 border-t border-[#EDE7F8]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isGCalConnected ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'
                      }`}
                    />
                    <span className="text-[11px] font-semibold text-[#302A38]">
                      {isGCalConnected
                        ? 'Connected to Google Calendar'
                        : 'Not connected to Google Account'}
                    </span>
                  </div>

                  {isGCalConnected ? (
                    <button
                      type="button"
                      onClick={handleDisconnectGoogleCalendar}
                      className="px-3 py-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
                    >
                      Disconnect Google Calendar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectGoogleCalendar}
                      className="px-3 py-1.5 text-[11px] font-bold text-white bg-[#6B4FA1] hover:bg-[#5A3F8C] rounded-lg shadow-xs transition flex items-center gap-1.5"
                    >
                      <span>Connect Google Calendar</span>
                    </button>
                  )}
                </div>

                {gcalFeedback && (
                  <p className="text-[11px] font-medium text-[#6B4FA1] bg-[#EDE7F8]/50 p-2 rounded-lg border border-[#B9A7E8]/40">
                    {gcalFeedback}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#EDE7F8] flex justify-end">
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2.5 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================== */}
      {/* ORDER DETAILS & LIFECYCLE MANAGEMENT MODAL */}
      {/* ==================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#302A38]/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#EDE7F8] shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE7F8]">
              <div>
                <span className="text-[10px] text-[#302A38]/60 uppercase font-bold block">Order Management</span>
                <span className="text-lg font-black font-mono text-[#302A38]">{selectedOrder.order_id}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setActionFeedback(null);
                }}
                className="p-1 text-[#302A38]/60 hover:text-[#302A38]"
              >
                ✕
              </button>
            </div>

            {actionFeedback && (
              <div className="p-3 bg-[#EDE7F8] text-[#6B4FA1] border border-[#B9A7E8] rounded-xl text-xs font-semibold">
                {actionFeedback}
              </div>
            )}

            {/* Customer & Product Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F8F6FC] rounded-xl border border-[#EDE7F8]">
                <span className="text-[10px] text-[#302A38]/60 uppercase block">Customer</span>
                <span className="font-bold text-[#302A38]">{selectedOrder.customer.full_name}</span>
                <div className="text-[11px] text-[#302A38]/70 font-mono mt-0.5">{selectedOrder.customer.phone_number}</div>
                <div className="text-[11px] text-[#302A38]/70 font-mono">{selectedOrder.customer.email}</div>
              </div>

              <div className="p-3 bg-[#F8F6FC] rounded-xl border border-[#EDE7F8]">
                <span className="text-[10px] text-[#302A38]/60 uppercase block">Product & Total</span>
                <span className="font-bold text-[#302A38]">{selectedOrder.product.product_name}</span>
                <div className="text-[11px] text-[#6B4FA1] mt-0.5">Quantity: {selectedOrder.quantity} unit(s)</div>
                {selectedOrder.colour && (
                  <div className="text-[11px] text-[#302A38] mt-0.5">
                    Selected Colour: <strong>{selectedOrder.colour}</strong>
                  </div>
                )}
                {selectedOrder.is_special_colour && (
                  <div className="mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 rounded-md">
                      Special Colour (+4 day lead buffer)
                    </span>
                  </div>
                )}
                {selectedOrder.estimated_completion_date && (
                  <div className="text-[11px] text-[#302A38]/70 mt-1">
                    Target Completion: <strong>{new Date(selectedOrder.estimated_completion_date).toLocaleDateString()}</strong>
                  </div>
                )}
                <div className="text-sm font-black text-[#6B4FA1] mt-1">R{selectedOrder.quoted_amount.toFixed(2)}</div>
              </div>
            </div>

            {/* Payment Proof Details */}
            {selectedOrder.payment_details.proof_of_payment && (
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase text-purple-900 block">Submitted Payment Proof</span>
                <div className="flex justify-between">
                  <span>Reference:</span>
                  <span className="font-mono font-bold text-purple-900">
                    {selectedOrder.payment_details.proof_of_payment.reference_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Payer Account:</span>
                  <span>{selectedOrder.payment_details.proof_of_payment.payer_name}</span>
                </div>
                {selectedOrder.payment_details.proof_of_payment.notes && (
                  <div className="text-purple-800 pt-1 italic">
                    Note: "{selectedOrder.payment_details.proof_of_payment.notes}"
                  </div>
                )}
              </div>
            )}

            {/* Owner Actions */}
            <div className="space-y-3 pt-2 border-t border-[#EDE7F8]">
              <label className="block text-xs font-bold text-[#302A38] uppercase tracking-wider">
                Advance Lifecycle Milestone
              </label>

              {/* Action 0: Review & Provide Quote if Pending Quote */}
              {selectedOrder.order_status === 'Pending Quote' && (
                <button
                  disabled={actionLoading}
                  onClick={() => {
                    setOrderForQuoteModal(selectedOrder);
                    setShowQuoteModal(true);
                  }}
                  className="w-full py-2.5 bg-[#6B4FA1] hover:bg-[#5A3F8C] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Review & Provide Quote (Set Amount & Lead Time)</span>
                </button>
              )}

              {/* Action 1: Verify Payment if Pending Verification */}
              {selectedOrder.order_status === 'Pending Verification' && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleVerifyPayment(selectedOrder.order_id)}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  Verify Payment (Change Status to Paid)
                </button>
              )}

              {/* Action 2: Milestones buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus(selectedOrder.order_id, 'In Progress')}
                  className="py-2 bg-[#F8F6FC] hover:bg-[#EDE7F8] text-[#6B4FA1] border border-[#EDE7F8] rounded-xl text-xs font-bold transition"
                >
                  Set In Progress
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus(selectedOrder.order_id, 'Ready for Collection')}
                  className="py-2 bg-[#F8F6FC] hover:bg-[#EDE7F8] text-[#6B4FA1] border border-[#EDE7F8] rounded-xl text-xs font-bold transition"
                >
                  Ready for Collection
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus(selectedOrder.order_id, 'Ready for Delivery')}
                  className="py-2 bg-[#F8F6FC] hover:bg-[#EDE7F8] text-[#6B4FA1] border border-[#EDE7F8] rounded-xl text-xs font-bold transition"
                >
                  Ready for Delivery
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus(selectedOrder.order_id, 'Completed')}
                  className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Mark as Completed
                </button>
              </div>

              {/* Owner Note */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-[#302A38]/70">
                  Add Milestone Audit Note
                </label>
                <input
                  type="text"
                  value={ownerNote}
                  onChange={(e) => setOwnerNote(e.target.value)}
                  placeholder="e.g. Dispatched via courier or ready at pickup point"
                  className="w-full bg-[#F8F6FC] border border-[#EDE7F8] rounded-xl px-3 py-1.5 text-xs text-[#302A38] focus:outline-none"
                />
              </div>
            </div>

            {/* Archive or Close */}
            <div className="flex items-center justify-between pt-3 border-t border-[#EDE7F8]">
              <button
                onClick={() => {
                  setArchiveModalOrder(selectedOrder);
                }}
                className="text-xs font-bold text-rose-600 hover:underline"
              >
                Archive this Order
              </button>

              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setActionFeedback(null);
                }}
                className="px-4 py-2 bg-[#EDE7F8] text-[#6B4FA1] rounded-xl text-xs font-bold hover:bg-[#B9A7E8]/40 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* ARCHIVE ORDER CONFIRMATION MODAL (Section 10) */}
      {/* "Before archiving: 'Are you sure you want to archive this order?'" */}
      {/* ==================================================== */}
      {archiveModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#302A38]/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 border border-[#EDE7F8] shadow-2xl max-w-md w-full space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#EDE7F8] text-[#6B4FA1] flex items-center justify-center">
              <Archive className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#302A38]">
                Are you sure you want to archive this order?
              </h3>
              <p className="text-xs text-[#302A38]/70 leading-relaxed">
                Order <span className="font-mono font-bold text-[#302A38]">{archiveModalOrder.order_id}</span> will be moved out of the active queue. It will remain securely stored in the database and accessible anytime from the Archived Orders tab.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setArchiveModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-[#302A38]/70 hover:text-[#302A38]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmArchive}
                className="px-4 py-2 text-xs font-bold text-white bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {actionLoading ? 'Archiving...' : 'Yes, Archive Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT MANAGER MODAL (Add / Edit Product + Raw Materials Linking) */}
      <ProductManagerModal
        isOpen={showProductManagerModal}
        product={selectedProductForEdit}
        inventory={inventoryList}
        onClose={() => {
          setShowProductManagerModal(false);
          setSelectedProductForEdit(null);
        }}
        onSuccess={() => {
          setShowProductManagerModal(false);
          setSelectedProductForEdit(null);
        }}
      />

      {/* ORDER QUOTE & LEAD TIME MODAL */}
      <OrderQuoteModal
        isOpen={showQuoteModal}
        order={orderForQuoteModal}
        onClose={() => {
          setShowQuoteModal(false);
          setOrderForQuoteModal(null);
        }}
        onSuccess={(updatedOrder) => {
          setSelectedOrder(updatedOrder);
        }}
      />
    </div>
  );
};
