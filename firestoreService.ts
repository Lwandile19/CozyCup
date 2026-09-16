import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Product,
  Order,
  Quote,
  CustomerRecord,
  OrderStatus,
  PaymentStatus,
  InventoryItem,
  OwnerNotification,
  CalendarEvent,
  BusinessSettings,
  DEFAULT_SETTINGS
} from '../types';
import { syncOrderToGoogleCalendar } from './calendarService';

// Fallback error message mandated by prompt
export const FIRESTORE_ERROR_MSG = 'Something went wrong. Please try again.';

// ============================================================================
// INITIAL SEED DATA (Used only if Firestore collections are initially empty)
// ============================================================================
export const INITIAL_PRODUCTS: Product[] = [
  {
    product_id: 'prod-001',
    product_name: 'CozyCup Classic Crochet Mug Cozy',
    category: 'Crochet',
    price: 85.0,
    currency: 'ZAR',
    stock_quantity: 18,
    availability_status: 'In Stock',
    description:
      'Handcrafted 100% soft cotton yarn sleeve with a natural wooden button. Keeps your warm drinks cozy while protecting your hands from hot mugs.',
    short_description: 'Pure cotton yarn mug sleeve with natural wooden button closure.',
    image_url:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    lead_time_days: 1,
    featured: true,
    linked_material_ids: ['mat-001', 'mat-006']
  },
  {
    product_id: 'prod-002',
    product_name: 'Handmade Crochet Sunflower Bouquet',
    category: 'Crochet',
    price: 180.0,
    currency: 'ZAR',
    stock_quantity: 8,
    availability_status: 'In Stock',
    description:
      'Everlasting crocheted sunflower bouquet with soft textured petals, detailed center seed stitch, and flexible green stems tied with satin ribbon.',
    short_description: 'Everlasting hand-crocheted sunflower bouquet with satin ribbon.',
    image_url:
      'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=800&q=80',
    lead_time_days: 2,
    featured: true,
    linked_material_ids: ['mat-002', 'mat-008']
  },
  {
    product_id: 'prod-003',
    product_name: 'Pastel Beaded Charm Bracelet',
    category: 'Bracelets',
    price: 65.0,
    currency: 'ZAR',
    stock_quantity: 24,
    availability_status: 'In Stock',
    description:
      'Dainty handmade elastic bracelet adorned with pastel polymer clay beads, glass seed accents, and a delicate silver-plated CozyCup star charm.',
    short_description: 'Pastel polymer beads and silver-plated star charm on stretch cord.',
    image_url:
      'https://images.unsplash.com/photo-1611591475155-42e47db98f86?auto=format&fit=crop&w=800&q=80',
    lead_time_days: 1,
    featured: true,
    linked_material_ids: ['mat-004', 'mat-005', 'mat-007']
  },
  {
    product_id: 'prod-004',
    product_name: 'Personalized Letter Friendship Bracelet',
    category: 'Bracelets',
    price: 55.0,
    currency: 'ZAR',
    stock_quantity: 35,
    availability_status: 'In Stock',
    description:
      'Hand-woven macramé cord bracelet customizable with white-and-gold alphabet beads. Water-resistant and adjustable slide-knot fit.',
    short_description: 'Hand-woven slide knot bracelet with personalized initial bead.',
    image_url:
      'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=800&q=80',
    lead_time_days: 1,
    featured: false,
    linked_material_ids: ['mat-004', 'mat-007']
  },
  {
    product_id: 'prod-005',
    product_name: 'Crochet Plushie Strawberry Keychain',
    category: 'Crochet',
    price: 75.0,
    currency: 'ZAR',
    stock_quantity: 14,
    availability_status: 'In Stock',
    description:
      'Cute amigurumi miniature strawberry keychain stuffed with hypoallergenic fiberfill. Features embroidered seeds and leafy calyx.',
    short_description: 'Miniature amigurumi strawberry keychain with gold clasp.',
    image_url:
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
    lead_time_days: 1,
    featured: false,
    linked_material_ids: ['mat-001', 'mat-005']
  },
  {
    product_id: 'prod-006',
    product_name: 'Custom Handcrafted Keepsake Mug & Cozy Set',
    category: 'Custom Orders',
    price: 140.0,
    currency: 'ZAR',
    stock_quantity: 10,
    availability_status: 'Made to Order',
    description:
      'Bespoke glazed ceramic mug paired with a tailored hand-knit cozy customized to your chosen colour palette and personalized monogram tag.',
    short_description: 'Tailored mug and crochet cozy set in your custom colour palette.',
    image_url:
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    lead_time_days: 3,
    featured: true,
    linked_material_ids: ['mat-001', 'mat-003', 'mat-006']
  }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'mat-001',
    item_name: 'Soft 100% Cotton Yarn - Pastel Pink',
    category: 'Yarn',
    quantity: 22,
    unit: 'skeins',
    low_stock_threshold: 5,
    cost_per_unit: 25,
    notes: 'Premium DK cotton yarn for mug cozies and strawberry plushies',
    linked_product_ids: ['prod-001', 'prod-005', 'prod-006'],
    updated_at: new Date().toISOString()
  },
  {
    id: 'mat-002',
    item_name: 'Soft 100% Cotton Yarn - Cream White',
    category: 'Yarn',
    quantity: 18,
    unit: 'skeins',
    low_stock_threshold: 5,
    cost_per_unit: 25,
    notes: 'Neutral base for sunflower bouquets and mug borders',
    linked_product_ids: ['prod-002'],
    updated_at: new Date().toISOString()
  },
  {
    id: 'mat-003',
    item_name: 'Soft 100% Cotton Yarn - Lavender Purple',
    category: 'Yarn',
    quantity: 14,
    unit: 'skeins',
    low_stock_threshold: 5,
    cost_per_unit: 25,
    notes: 'Signature CozyCup purple shade for signature cozies',
    linked_product_ids: ['prod-006'],
    updated_at: new Date().toISOString()
  },
  {
    id: 'mat-004',
    item_name: 'Polymer Clay Pastel Beads (Mixed)',
    category: 'Beads',
    quantity: 1200,
    unit: 'units',
    low_stock_threshold: 200,
    cost_per_unit: 0.15,
    notes: '6mm flat disc polymer clay beads in assorted rainbow and pastel tones',
    linked_product_ids: ['prod-003', 'prod-004'],
    updated_at: new Date().toISOString()
  },
  {
    id: 'mat-005',
    item_name: 'Silver-Plated Star & Heart Charms',
    category: 'Charms & Clasps',
    quantity: 45,
    unit: 'units',
    low_stock_threshold: 10,
    cost_per_unit: 3.5,
    notes: 'Hypoallergenic zinc alloy charms for beaded bracelets and keychains',
    linked_product_ids: ['prod-003', 'prod-005'],
    updated_at: new Date().toISOString()
  },
  {
    id: 'mat-006',
    item_name: 'Natural Carved Wooden Buttons (20mm)',
    category: 'Charms & Clasps',
    quantity: 60,
    unit: 'units',
    low_stock_threshold: 15,
    cost_per_unit: 2.0,
    notes: 'Eco-friendly wooden button closures for mug cozy fastening',
    linked_product_ids: ['prod-001', 'prod-006'],
    updated_at: new Date().toISOString()
  },
  {
    id: 'mat-007',
    item_name: '0.8mm Elastic Stretch Beading Cord',
    category: 'Thread',
    quantity: 8,
    unit: 'spools',
    low_stock_threshold: 2,
    cost_per_unit: 18,
    notes: 'Durable clear elastic cord for comfortable stretch bracelets',
    linked_product_ids: ['prod-003', 'prod-004'],
    updated_at: new Date().toISOString()
  },
  {
    id: 'mat-008',
    item_name: 'Lilac Satin Packaging Ribbons',
    category: 'Packaging',
    quantity: 12,
    unit: 'rolls',
    low_stock_threshold: 3,
    cost_per_unit: 14,
    notes: 'Boutique finishing ribbons for bouquets and gift wrap',
    linked_product_ids: ['prod-002'],
    updated_at: new Date().toISOString()
  }
];

// ============================================================================
// REAL-TIME SUBSCRIBERS (Firestore onSnapshot listeners)
// ============================================================================

/**
 * Real-time listener for Products collection
 * Auto-seeds Firestore if collection is currently empty.
 */
export function subscribeToProducts(
  callback: (products: Product[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const colRef = collection(db, 'products');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial products to Firestore
        try {
          for (const item of INITIAL_PRODUCTS) {
            await setDoc(doc(db, 'products', item.product_id), item);
          }
        } catch (e) {
          console.warn('Auto-seed products note:', e);
          callback(INITIAL_PRODUCTS);
          return;
        }
      }

      const products: Product[] = [];
      snapshot.forEach((d) => {
        products.push(d.data() as Product);
      });

      // Sort by featured first, then name
      products.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return a.product_name.localeCompare(b.product_name);
      });

      callback(products.length > 0 ? products : INITIAL_PRODUCTS);
    },
    (error) => {
      console.error('Products listener error:', error);
      if (onError) onError(error);
      callback(INITIAL_PRODUCTS);
    }
  );
}

/**
 * Real-time listener for Orders collection
 * Customers and Owner both listen to this single source of truth.
 */
export function subscribeToOrders(
  callback: (orders: Order[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const colRef = collection(db, 'orders');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((d) => {
        orders.push(d.data() as Order);
      });

      // Sort by newest created first
      orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      callback(orders);
    },
    (error) => {
      console.error('Orders listener error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Real-time listener for a single Order by order_id
 * Used for Customer Order Tracking and Real-Time Modal updates.
 */
export function subscribeToOrderById(
  orderId: string,
  callback: (order: Order | null) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const docRef = doc(db, 'orders', orderId);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as Order);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(`Order ${orderId} listener error:`, error);
      if (onError) onError(error);
    }
  );
}

/**
 * Directly fetch a single order by order_id from Firestore.
 */
export async function getOrderByIdFromFirestore(orderId: string): Promise<Order | null> {
  if (!orderId?.trim()) return null;
  try {
    const docRef = doc(db, 'orders', orderId.trim());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as Order;
    }
    const colRef = collection(db, 'orders');
    const q = query(colRef, where('order_id', '==', orderId.trim()));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      return qSnap.docs[0].data() as Order;
    }
    return null;
  } catch (err) {
    console.error(`Error fetching order ${orderId}:`, err);
    return null;
  }
}

/**
 * Real-time listener for Inventory materials
 * Auto-seeds Firestore inventory if empty.
 */
export function subscribeToInventory(
  callback: (items: InventoryItem[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const colRef = collection(db, 'inventory');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        try {
          for (const item of INITIAL_INVENTORY) {
            await setDoc(doc(db, 'inventory', item.id), item);
          }
        } catch (e) {
          console.warn('Auto-seed inventory note:', e);
          callback(INITIAL_INVENTORY);
          return;
        }
      }

      const items: InventoryItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as any;
        const matId = data.material_id || data.id || d.id;
        const matName = data.name || data.item_name || 'Material';
        const threshold = data.min_threshold ?? data.low_stock_threshold ?? 5;
        items.push({
          ...data,
          id: matId,
          material_id: matId,
          name: matName,
          item_name: matName,
          low_stock_threshold: threshold,
          min_threshold: threshold
        });
      });

      items.sort((a, b) => (a.item_name || a.name || '').localeCompare(b.item_name || b.name || ''));
      callback(items.length > 0 ? items : INITIAL_INVENTORY);
    },
    (error) => {
      console.error('Inventory listener error:', error);
      if (onError) onError(error);
      callback(INITIAL_INVENTORY);
    }
  );
}

/**
 * Real-time listener for Customer records
 */
export function subscribeToCustomers(
  callback: (customers: CustomerRecord[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const colRef = collection(db, 'customers');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const customers: CustomerRecord[] = [];
      snapshot.forEach((d) => {
        customers.push(d.data() as CustomerRecord);
      });
      customers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      callback(customers);
    },
    (error) => {
      console.error('Customers listener error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Real-time listener for Owner Notifications
 */
export function subscribeToNotifications(
  callback: (notifs: OwnerNotification[]) => void
): Unsubscribe {
  const colRef = collection(db, 'notifications');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const notifs: OwnerNotification[] = [];
      snapshot.forEach((d) => {
        notifs.push(d.data() as OwnerNotification);
      });
      notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      callback(notifs);
    },
    (error) => {
      console.error('Notifications listener error:', error);
    }
  );
}

/**
 * Real-time listener for Calendar Events
 */
export function subscribeToCalendarEvents(
  callback: (events: CalendarEvent[]) => void
): Unsubscribe {
  const colRef = collection(db, 'calendarEvents');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const events: CalendarEvent[] = [];
      snapshot.forEach((d) => {
        events.push(d.data() as CalendarEvent);
      });
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      callback(events);
    },
    (error) => {
      console.error('Calendar listener error:', error);
    }
  );
}

// ============================================================================
// MUTATIONS & ORDER WORKFLOW (Atomic Firestore Operations)
// ============================================================================

export interface CreateOrderInput {
  product_id: string;
  quantity: number;
  full_name: string;
  email: string;
  phone_number: string;
  item_category: string;
  item_requested: string;
  colour: string;
  is_special_colour?: boolean;
  popia_consent: boolean;
  estimated_completion_date?: string;
  estimated_completion_note?: string;
  is_quick_order?: boolean;
  order_type?: 'standard' | 'quick' | 'custom' | string;
}

/**
 * Step 1: Customer Submits Order
 * Writes to Firestore `orders` and `customers`, generates initial quote.
 */
export async function createOrderInFirestore(input: CreateOrderInput): Promise<Order> {
  // 1. Validation to prevent incomplete/duplicate records
  if (!input.full_name?.trim()) throw new Error('Full Name is required');
  if (!input.phone_number?.trim()) throw new Error('Phone Number is required');
  if (!input.email?.trim() || !input.email.includes('@')) throw new Error('Valid Email Address is required');
  if (!input.item_requested?.trim()) throw new Error('Item Requested is required');
  if (!input.popia_consent) throw new Error('POPIA consent is mandatory');
  if (!input.quantity || input.quantity < 1) throw new Error('Quantity must be at least 1');

  try {
    // 2. Fetch latest product info directly from Firestore
    let productSnap = await getDoc(doc(db, 'products', input.product_id));
    let productData: Product | null = productSnap.exists() ? (productSnap.data() as Product) : null;

    if (!productData) {
      // Look in fallback initial products if not yet written
      productData = INITIAL_PRODUCTS.find((p) => p.product_id === input.product_id) || null;
    }

    const unitPrice = productData ? productData.price : 85.0;
    const subtotal = unitPrice * input.quantity;
    const packagingDelivery = subtotal > 200 ? 0 : 35.0;
    const totalAmount = subtotal + packagingDelivery;

    const orderId = `ORD-CC-${Date.now().toString().slice(-6)}`;
    const customerId = `CUST-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const nowIso = new Date().toISOString();

    const customerRecord: CustomerRecord = {
      customer_id: customerId,
      full_name: input.full_name.trim(),
      email: input.email.trim().toLowerCase(),
      phone_number: input.phone_number.trim(),
      popia_consent: true,
      created_at: nowIso,
      updated_at: nowIso
    };

    const quoteBreakdown: Quote = {
      order_id: orderId,
      product_id: input.product_id,
      product_name: input.item_requested,
      unit_price: unitPrice,
      quantity: input.quantity,
      subtotal,
      packaging_delivery: packagingDelivery,
      total_quoted_amount: totalAmount,
      currency: 'ZAR',
      generated_at: nowIso,
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    // Calculate default estimated date if not passed
    let estDate = input.estimated_completion_date;
    if (!estDate) {
      const d = new Date();
      d.setDate(d.getDate() + (input.item_category === 'Crochet' ? 3 : 2));
      estDate = d.toISOString();
    }

    const newOrder: Order = {
      order_id: orderId,
      customer_id: customerId,
      customer: customerRecord,
      product: {
        product_id: input.product_id,
        product_name: input.item_requested,
        category: input.item_category || 'Crochet',
        price: unitPrice,
        currency: 'ZAR',
        image_url:
          productData?.image_url ||
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80'
      },
      quantity: input.quantity,
      quoted_amount: totalAmount,
      quote_breakdown: quoteBreakdown,
      order_status: 'Pending Quote', // Owner reviews and sends/approves quote
      payment_status: 'Unpaid',
      payment_details: {
        bank_name: 'FNB',
        account_name: 'Ms Roseane',
        account_number: '63179179370',
        branch_code: '250655',
        account_type: 'Cheque / Current',
        amount_due: totalAmount,
        currency: 'ZAR',
        payment_reference: orderId,
        instructions: `Please transfer R${totalAmount.toFixed(
          2
        )} into CozyCup FNB account using reference ${orderId}.`,
        payment_status: 'Unpaid',
        proof_of_payment: null,
        submitted_at: null,
        verified_at: null,
        verified_by: null
      },
      item_category: input.item_category,
      item_requested: input.item_requested,
      colour: input.colour,
      is_special_colour: !!input.is_special_colour,
      estimated_completion_date: estDate,
      estimated_completion_note: input.estimated_completion_note || 'Handcrafted to order',
      is_bigger_item: input.quantity >= 3,
      can_cancel: true,
      is_quick_order: !!input.is_quick_order,
      order_type: input.order_type || (input.is_quick_order ? 'quick' : 'custom'),
      is_archived: false,
      timeline: [
        {
          id: `tl-${Date.now()}-1`,
          status: 'Pending Quote',
          timestamp: nowIso,
          note: `Order submitted by ${customerRecord.full_name}. Awaiting owner review.`,
          actor: 'Customer'
        }
      ],
      created_at: nowIso,
      updated_at: nowIso
    };

    // Write Customer and Order to Firestore
    await setDoc(doc(db, 'customers', customerId), customerRecord);
    await setDoc(doc(db, 'orders', orderId), newOrder);

    // Also write to quotes collection
    await setDoc(doc(db, 'quotes', `QTE-${orderId}`), {
      quote_id: `QTE-${orderId}`,
      ...quoteBreakdown
    });

    return newOrder;
  } catch (err: any) {
    console.error('createOrderInFirestore error:', err);
    throw new Error(err.message || FIRESTORE_ERROR_MSG);
  }
}

/**
 * Step 2: Owner Approves or Updates Quote
 */
export async function updateQuoteInFirestore(
  orderId: string,
  newAmount: number,
  breakdownOrEstimatedDate?:
    | string
    | {
        subtotal?: number;
        packaging_delivery?: number;
        special_colour_surcharge?: number;
        notes?: string;
        estimatedDate?: string;
        lead_time_days?: number;
      },
  leadDaysOrNotes?: number | string
): Promise<Order> {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists()) throw new Error('Order not found');

    const order = orderDoc.data() as Order;
    const nowIso = new Date().toISOString();

    let subtotalVal = newAmount - (order.quote_breakdown?.packaging_delivery || 0);
    let packagingVal = order.quote_breakdown?.packaging_delivery || 0;
    let ownerNotes = '';
    let targetEstimatedDate = order.estimated_completion_date;

    if (typeof breakdownOrEstimatedDate === 'object' && breakdownOrEstimatedDate !== null) {
      if (typeof breakdownOrEstimatedDate.subtotal === 'number') {
        subtotalVal = breakdownOrEstimatedDate.subtotal;
      }
      if (typeof breakdownOrEstimatedDate.packaging_delivery === 'number') {
        packagingVal = breakdownOrEstimatedDate.packaging_delivery;
      }
      if (breakdownOrEstimatedDate.notes) {
        ownerNotes = breakdownOrEstimatedDate.notes;
      }
      if (breakdownOrEstimatedDate.estimatedDate) {
        targetEstimatedDate = breakdownOrEstimatedDate.estimatedDate;
      }
    } else if (typeof breakdownOrEstimatedDate === 'string') {
      targetEstimatedDate = breakdownOrEstimatedDate;
    }

    if (typeof leadDaysOrNotes === 'string') {
      ownerNotes = leadDaysOrNotes;
    } else if (typeof leadDaysOrNotes === 'number') {
      const completion = new Date();
      completion.setDate(completion.getDate() + leadDaysOrNotes);
      targetEstimatedDate = completion.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }

    const updatedQuote: Quote = {
      ...order.quote_breakdown,
      total_quoted_amount: newAmount,
      subtotal: subtotalVal,
      packaging_delivery: packagingVal,
      generated_at: nowIso
    };

    const updatedTimeline = [
      ...order.timeline,
      {
        id: `tl-${Date.now()}`,
        status: 'Quote Sent' as OrderStatus,
        timestamp: nowIso,
        note: `Owner provided verified quote: R${newAmount.toFixed(2)}. ${ownerNotes || ''}`.trim(),
        actor: 'Business Owner' as const
      }
    ];

    const updates: Partial<Order> = {
      quoted_amount: newAmount,
      quote_breakdown: updatedQuote,
      order_status: 'Quote Sent',
      estimated_completion_date: targetEstimatedDate || order.estimated_completion_date,
      payment_details: {
        ...order.payment_details,
        amount_due: newAmount,
        instructions: `Please transfer R${newAmount.toFixed(
          2
        )} into CozyCup FNB account using reference ${orderId}.`
      },
      timeline: updatedTimeline,
      updated_at: nowIso
    };

    await updateDoc(doc(db, 'orders', orderId), updates);

    return { ...order, ...updates };
  } catch (err: any) {
    console.error('updateQuoteInFirestore error:', err);
    throw new Error(err.message || FIRESTORE_ERROR_MSG);
  }
}

/**
 * Step 3: Customer Accepts Quote
 * Order status moves to 'Awaiting Payment'. Payment instructions shown.
 */
export async function acceptQuoteInFirestore(orderId: string): Promise<Order> {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists()) throw new Error('Order not found');

    const order = orderDoc.data() as Order;
    const nowIso = new Date().toISOString();

    const updatedTimeline = [
      ...order.timeline,
      {
        id: `tl-${Date.now()}`,
        status: 'Awaiting Payment' as OrderStatus,
        timestamp: nowIso,
        note: 'Customer accepted the quote. Ready for FNB EFT payment.',
        actor: 'Customer' as const
      }
    ];

    const updates: Partial<Order> = {
      order_status: 'Awaiting Payment',
      payment_status: 'Awaiting Payment',
      payment_details: {
        ...order.payment_details,
        payment_status: 'Awaiting Payment'
      },
      timeline: updatedTimeline,
      updated_at: nowIso
    };

    await updateDoc(doc(db, 'orders', orderId), updates);
    return { ...order, ...updates };
  } catch (err: any) {
    console.error('acceptQuoteInFirestore error:', err);
    throw new Error(err.message || FIRESTORE_ERROR_MSG);
  }
}

/**
 * Step 5: Customer Submits Proof of Payment
 * Status MUST BE "Pending Verification". Owner MUST manually verify.
 * DO NOT mark as Paid here. DO NOT trigger Google Calendar here.
 */
export async function submitPaymentProofInFirestore(
  orderId: string,
  proof: {
    reference_number: string;
    payer_name?: string;
    file_name?: string;
    notes?: string;
  }
): Promise<Order> {
  if (!proof.reference_number?.trim()) {
    throw new Error('Payment reference number is required');
  }

  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists()) throw new Error('Order not found');

    const order = orderDoc.data() as Order;
    const nowIso = new Date().toISOString();

    const proofData = {
      reference_number: proof.reference_number.trim(),
      payer_name: proof.payer_name?.trim() || order.customer.full_name,
      file_name: proof.file_name?.trim() || 'fnb_proof_of_payment.pdf',
      notes: proof.notes?.trim() || '',
      submitted_at: nowIso
    };

    const updatedTimeline = [
      ...order.timeline,
      {
        id: `tl-${Date.now()}`,
        status: 'Pending Verification' as OrderStatus,
        timestamp: nowIso,
        note: `Proof of payment submitted (Ref: ${proofData.reference_number}). Awaiting owner manual verification.`,
        actor: 'Customer' as const
      }
    ];

    const updates: Partial<Order> = {
      order_status: 'Pending Verification',
      payment_status: 'Pending Verification',
      payment_details: {
        ...order.payment_details,
        payment_status: 'Pending Verification',
        proof_of_payment: proofData,
        submitted_at: nowIso
      },
      timeline: updatedTimeline,
      updated_at: nowIso
    };

    // Update Order in Firestore
    await updateDoc(doc(db, 'orders', orderId), updates);

    // Write record to payments collection
    const paymentId = `PAY-${orderId}`;
    await setDoc(doc(db, 'payments', paymentId), {
      payment_id: paymentId,
      order_id: orderId,
      amount_due: order.quoted_amount,
      currency: 'ZAR',
      payment_status: 'Pending Verification',
      payment_reference: proofData.reference_number,
      proof_of_payment: proofData,
      submitted_at: nowIso
    });

    // Write owner notification
    const notifId = `notif-${Date.now()}`;
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      order_id: orderId,
      type: 'PAYMENT_PROOF_UPLOADED',
      subject: `Proof of Payment uploaded for ${orderId}`,
      customer_name: order.customer.full_name,
      customer_email: order.customer.email,
      customer_phone: order.customer.phone_number,
      product_name: order.product.product_name,
      item_requested: order.item_requested,
      colour: order.colour,
      quantity: order.quantity,
      quoted_amount: order.quoted_amount,
      estimated_completion_date: order.estimated_completion_date,
      created_at: nowIso,
      read: false
    });

    return { ...order, ...updates };
  } catch (err: any) {
    console.error('submitPaymentProofInFirestore error:', err);
    throw new Error(err.message || FIRESTORE_ERROR_MSG);
  }
}

/**
 * Step 6: Owner Verifies Payment
 * Owner clicks "Verify Payment".
 * Payment status -> "Verified"
 * Order status -> "Paid"
 * ONLY HERE is Google Calendar triggered!
 */
export async function verifyPaymentInFirestore(
  orderId: string,
  verifiedBy = 'Ms Roseane'
): Promise<Order> {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists()) throw new Error('Order not found');

    const order = orderDoc.data() as Order;
    const nowIso = new Date().toISOString();

    const updatedTimeline = [
      ...order.timeline,
      {
        id: `tl-${Date.now()}`,
        status: 'Paid' as OrderStatus,
        timestamp: nowIso,
        note: `FNB payment verified by ${verifiedBy}. Order is confirmed and crafting will commence.`,
        actor: 'Business Owner' as const
      }
    ];

    const updates: Partial<Order> = {
      order_status: 'Paid',
      payment_status: 'Verified',
      payment_details: {
        ...order.payment_details,
        payment_status: 'Verified',
        verified_at: nowIso,
        verified_by: verifiedBy
      },
      timeline: updatedTimeline,
      updated_at: nowIso
    };

    // Update Order in Firestore
    await updateDoc(doc(db, 'orders', orderId), updates);

    // Update Payments collection
    const paymentId = `PAY-${orderId}`;
    await updateDoc(doc(db, 'payments', paymentId), {
      payment_status: 'Verified',
      verified_at: nowIso,
      verified_by: verifiedBy
    }).catch(() => {});

    const updatedOrder = { ...order, ...updates };

    // Calendar Integration: TRIGGERED ONLY WHEN OWNER VERIFIES PAYMENT (Requirement 6)
    try {
      await syncOrderToGoogleCalendar(updatedOrder, true);
    } catch (calErr) {
      console.warn('Google Calendar sync notice:', calErr);
    }

    // Also add to internal calendarEvents collection in Firestore
    const calEventId = `cal-${Date.now()}`;
    await setDoc(doc(db, 'calendarEvents', calEventId), {
      id: calEventId,
      order_id: orderId,
      title: `Order ${orderId} Ready - ${order.customer.full_name}`,
      description: `Craft: ${order.item_requested} (${order.colour}, qty ${order.quantity}). Verified Paid.`,
      date: order.estimated_completion_date,
      customer_name: order.customer.full_name,
      product_name: order.item_requested,
      created_at: nowIso
    }).catch(() => {});

    return updatedOrder;
  } catch (err: any) {
    console.error('verifyPaymentInFirestore error:', err);
    throw new Error(err.message || FIRESTORE_ERROR_MSG);
  }
}

/**
 * Owner updates Order Status (e.g., 'In Progress', 'Ready for Collection', 'Completed')
 */
export async function updateOrderStatusInFirestore(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
): Promise<Order> {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists()) throw new Error('Order not found');

    const order = orderDoc.data() as Order;
    const nowIso = new Date().toISOString();

    const updatedTimeline = [
      ...order.timeline,
      {
        id: `tl-${Date.now()}`,
        status: newStatus,
        timestamp: nowIso,
        note: note || `Order status transitioned to ${newStatus}.`,
        actor: 'Business Owner' as const
      }
    ];

    const updates: Partial<Order> = {
      order_status: newStatus,
      timeline: updatedTimeline,
      updated_at: nowIso
    };

    await updateDoc(doc(db, 'orders', orderId), updates);
    return { ...order, ...updates };
  } catch (err: any) {
    console.error('updateOrderStatusInFirestore error:', err);
    throw new Error(err.message || FIRESTORE_ERROR_MSG);
  }
}

/**
 * Customer Cancels Order
 */
export async function cancelOrderInFirestore(orderId: string, reason?: string): Promise<Order> {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists()) throw new Error('Order not found');

    const order = orderDoc.data() as Order;
    if (!order.can_cancel && order.order_status === 'Paid') {
      throw new Error('Orders that have been verified and paid cannot be cancelled online. Please contact the owner.');
    }

    const nowIso = new Date().toISOString();
    const updatedTimeline = [
      ...order.timeline,
      {
        id: `tl-${Date.now()}`,
        status: 'Cancelled' as OrderStatus,
        timestamp: nowIso,
        note: `Order cancelled by customer. Reason: ${reason || 'Not specified'}`,
        actor: 'Customer' as const
      }
    ];

    const updates: Partial<Order> = {
      order_status: 'Cancelled',
      cancellation_reason: reason || 'Cancelled by customer',
      cancelled_at: nowIso,
      timeline: updatedTimeline,
      updated_at: nowIso
    };

    await updateDoc(doc(db, 'orders', orderId), updates);
    return { ...order, ...updates };
  } catch (err: any) {
    console.error('cancelOrderInFirestore error:', err);
    throw new Error(err.message || FIRESTORE_ERROR_MSG);
  }
}

/**
 * Owner Archives Order
 */
export async function archiveOrderInFirestore(orderId: string, archive = true): Promise<Order> {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists()) throw new Error('Order not found');

    const order = orderDoc.data() as Order;
    const nowIso = new Date().toISOString();

    const updates: Partial<Order> = {
      is_archived: archive,
      archived: archive,
      archived_at: archive ? nowIso : null,
      updated_at: nowIso
    };

    await updateDoc(doc(db, 'orders', orderId), updates);
    return { ...order, ...updates };
  } catch (err: any) {
    console.error('archiveOrderInFirestore error:', err);
    throw new Error(err.message || FIRESTORE_ERROR_MSG);
  }
}

// ============================================================================
// OWNER PRODUCT MANAGEMENT (Firestore CRUD)
// ============================================================================

export async function saveProductInFirestore(product: Product): Promise<Product> {
  if (!product.product_name?.trim()) throw new Error('Product name is required');
  if (product.price <= 0) throw new Error('Price must be greater than 0');

  try {
    const productId =
      product.product_id ||
      `prod-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 5)}`;
    const productToSave: Product = {
      ...product,
      product_id: productId,
      updated_at: new Date().toISOString()
    };

    await setDoc(doc(db, 'products', productId), productToSave);
    return productToSave;
  } catch (err: any) {
    console.error('saveProductInFirestore error:', err);
    throw new Error(err.message || FIRESTORE_ERROR_MSG);
  }
}

export async function deleteProductInFirestore(productId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (err: any) {
    console.error('deleteProductInFirestore error:', err);
    throw new Error(err.message || FIRESTORE_ERROR_MSG);
  }
}

// ============================================================================
// OWNER INVENTORY MANAGEMENT (Firestore CRUD)
// ============================================================================

export async function saveInventoryItemInFirestore(item: InventoryItem): Promise<InventoryItem> {
  const matName = (item.name || item.item_name || '').trim();
  if (!matName) throw new Error('Material name is required');
  if (item.quantity < 0) throw new Error('Quantity cannot be negative');

  try {
    const itemId =
      item.material_id ||
      item.id ||
      `mat-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 5)}`;
    const threshold = item.min_threshold ?? item.low_stock_threshold ?? 5;

    const itemToSave: InventoryItem = {
      ...item,
      id: itemId,
      material_id: itemId,
      item_name: matName,
      name: matName,
      low_stock_threshold: threshold,
      min_threshold: threshold,
      quantity: Number(item.quantity) || 0,
      unit: item.unit || 'units',
      cost_per_unit: Number(item.cost_per_unit) || 0,
      notes: item.notes || '',
      linked_product_ids: item.linked_product_ids || [],
      updated_at: new Date().toISOString()
    };

    await setDoc(doc(db, 'inventory', itemId), itemToSave);

    // If material is low/out of stock and linked to products, update linked products
    if (itemToSave.linked_product_ids && itemToSave.linked_product_ids.length > 0) {
      const isDepleted = itemToSave.quantity === 0;
      const isLow = itemToSave.quantity <= threshold;

      for (const pId of itemToSave.linked_product_ids) {
        try {
          const pDoc = await getDoc(doc(db, 'products', pId));
          if (pDoc.exists()) {
            const p = pDoc.data() as Product;
            let newStatus = p.availability_status;
            if (isDepleted && p.availability_status !== 'Made to Order') {
              newStatus = 'Out of Stock';
            } else if (isLow && p.availability_status === 'In Stock') {
              newStatus = 'Low Stock';
            } else if (!isLow && !isDepleted && (p.availability_status === 'Low Stock' || p.availability_status === 'Out of Stock')) {
              newStatus = 'In Stock';
            }
            if (newStatus !== p.availability_status) {
              await updateDoc(doc(db, 'products', pId), { availability_status: newStatus });
            }
          }
        } catch (e) {
          console.warn(`Note updating linked product ${pId}:`, e);
        }
      }
    }

    return itemToSave;
  } catch (err: any) {
    console.error('saveInventoryItemInFirestore error:', err);
    throw new Error(err.message || FIRESTORE_ERROR_MSG);
  }
}

export async function updateInventoryQuantityInFirestore(
  itemId: string,
  newQuantity: number
): Promise<void> {
  const cleanQty = Math.max(0, Number(newQuantity) || 0);

  try {
    const docRef = doc(db, 'inventory', itemId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const currentData = snap.data() as any;
      const threshold = currentData.min_threshold ?? currentData.low_stock_threshold ?? 5;

      await updateDoc(docRef, {
        quantity: cleanQty,
        updated_at: new Date().toISOString()
      });

      // Check linked products if quantity status changes
      const linkedProductIds: string[] = currentData.linked_product_ids || [];
      if (linkedProductIds.length > 0) {
        const isDepleted = cleanQty === 0;
        const isLow = cleanQty <= threshold;

        for (const pId of linkedProductIds) {
          try {
            const pDocRef = doc(db, 'products', pId);
            const pDoc = await getDoc(pDocRef);
            if (pDoc.exists()) {
              const p = pDoc.data() as Product;
              let newStatus = p.availability_status;

              if (isDepleted && p.availability_status !== 'Made to Order') {
                newStatus = 'Out of Stock';
              } else if (isLow && p.availability_status === 'In Stock') {
                newStatus = 'Low Stock';
              } else if (!isLow && !isDepleted && (p.availability_status === 'Low Stock' || p.availability_status === 'Out of Stock')) {
                newStatus = 'In Stock';
              }

              if (newStatus !== p.availability_status) {
                await updateDoc(pDocRef, { availability_status: newStatus });
              }
            }
          } catch (e) {
            console.warn(`Note updating linked product ${pId}:`, e);
          }
        }
      }
    } else {
      await setDoc(
        doc(db, 'inventory', itemId),
        {
          id: itemId,
          material_id: itemId,
          quantity: cleanQty,
          updated_at: new Date().toISOString()
        },
        { merge: true }
      );
    }
  } catch (err: any) {
    console.error('updateInventoryQuantityInFirestore error:', err);
    throw new Error(err.message || FIRESTORE_ERROR_MSG);
  }
}

export async function deleteInventoryItemInFirestore(itemId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'inventory', itemId));
  } catch (err: any) {
    console.error('deleteInventoryItemInFirestore error:', err);
    throw new Error(err.message || FIRESTORE_ERROR_MSG);
  }
}

// ============================================================================
// OWNER SETTINGS (Firestore)
// ============================================================================

export async function fetchBusinessSettingsFromFirestore(): Promise<BusinessSettings> {
  try {
    const d = await getDoc(doc(db, 'settings', 'general'));
    if (d.exists()) {
      return d.data() as BusinessSettings;
    }
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveBusinessSettingsInFirestore(
  settings: BusinessSettings
): Promise<BusinessSettings> {
  try {
    await setDoc(doc(db, 'settings', 'general'), settings);
    return settings;
  } catch (err: any) {
    console.error('saveBusinessSettingsInFirestore error:', err);
    throw new Error(err.message || FIRESTORE_ERROR_MSG);
  }
}
