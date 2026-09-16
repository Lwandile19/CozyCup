import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';
import {
  Product,
  Order,
  OrderStatus,
  PaymentStatus,
  CustomerRecord,
  TimelineEvent,
  Quote,
  PaymentDetails,
  FNB_BANKING_DETAILS,
  OwnerNotification,
  CalendarEvent,
  BusinessSettings
} from './src/types.ts';
import {
  calculateEstimatedCompletion,
  isSpecialColourRequested
} from './src/utils/dateEstimator.ts';

dotenv.config();

// Secure Server-Side Authorized Business Owner emails
const AUTHORIZED_OWNER_EMAILS = (
  process.env.AUTHORIZED_OWNER_EMAILS ||
  'roseanemodise@gmail.com,augustlionn1108@gmail.com'
)
  .split(',')
  .map((e) => e.trim().toLowerCase());

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// ----------------------------------------------------
// Persistent Database Store File & Initial Seed Data
// ----------------------------------------------------
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

const INITIAL_PRODUCTS: Product[] = [
  {
    product_id: 'prod-001',
    product_name: 'CozyCup Classic Crochet Mug Cozy',
    category: 'Crochet',
    price: 85.00,
    currency: 'ZAR',
    stock_quantity: 18,
    availability_status: 'In Stock',
    description: 'Handcrafted 100% soft cotton yarn sleeve with a natural wooden button. Keeps your warm drinks cozy while protecting your hands from hot mugs.',
    short_description: 'Pure cotton yarn mug sleeve with natural wooden button closure.',
    image_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    lead_time_days: 1,
    featured: true
  },
  {
    product_id: 'prod-002',
    product_name: 'Handmade Crochet Sunflower Bouquet',
    category: 'Crochet',
    price: 180.00,
    currency: 'ZAR',
    stock_quantity: 8,
    availability_status: 'In Stock',
    description: 'Everlasting crocheted sunflower bouquet with soft textured petals, detailed center seed stitch, and flexible green stems tied with satin ribbon.',
    short_description: 'Everlasting hand-crocheted sunflower bouquet with satin ribbon.',
    image_url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=800&q=80',
    lead_time_days: 2,
    featured: true
  },
  {
    product_id: 'prod-003',
    product_name: 'Pastel Beaded Charm Bracelet',
    category: 'Bracelets',
    price: 65.00,
    currency: 'ZAR',
    stock_quantity: 24,
    availability_status: 'In Stock',
    description: 'Dainty handmade elastic bracelet adorned with pastel polymer clay beads, glass seed accents, and a delicate silver-plated CozyCup star charm.',
    short_description: 'Pastel polymer beads and silver-plated star charm on stretch cord.',
    image_url: 'https://images.unsplash.com/photo-1611591475155-42e47db98f86?auto=format&fit=crop&w=800&q=80',
    lead_time_days: 1,
    featured: true
  },
  {
    product_id: 'prod-004',
    product_name: 'Personalized Letter Friendship Bracelet',
    category: 'Bracelets',
    price: 55.00,
    currency: 'ZAR',
    stock_quantity: 35,
    availability_status: 'In Stock',
    description: 'Hand-woven macramé cord bracelet customizable with white-and-gold alphabet beads. Water-resistant and adjustable slide-knot fit.',
    short_description: 'Hand-woven slide knot bracelet with personalized initial bead.',
    image_url: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=800&q=80',
    lead_time_days: 1,
    featured: false
  },
  {
    product_id: 'prod-005',
    product_name: 'Crochet Plushie Strawberry Keychain',
    category: 'Crochet',
    price: 75.00,
    currency: 'ZAR',
    stock_quantity: 14,
    availability_status: 'In Stock',
    description: 'Cute amigurumi miniature strawberry keychain stuffed with hypoallergenic fiberfill. Features embroidered seeds and leafy calyx.',
    short_description: 'Miniature amigurumi strawberry keychain with gold clasp.',
    image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
    lead_time_days: 1,
    featured: false
  },
  {
    product_id: 'prod-006',
    product_name: 'Bespoke Custom Crochet & Bracelet Gift Bundle',
    category: 'Custom Orders',
    price: 260.00,
    currency: 'ZAR',
    stock_quantity: 6,
    availability_status: 'Made to Order',
    description: 'A curated gift package including a custom color-selected crochet mug cozy, a matching handmade beaded bracelet, and a handwritten floral greeting card.',
    short_description: 'Custom color-themed mug cozy, matching bracelet, and gift card.',
    image_url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
    lead_time_days: 3,
    featured: true
  }
];

const INITIAL_CUSTOMERS: CustomerRecord[] = [
  {
    customer_id: 'CUST-1001',
    full_name: 'Lwandile Ndlovu',
    email: 'lwandile.ndlovu@gmail.com',
    phone_number: '0812345678',
    popia_consent: true,
    created_at: '2026-09-12T10:30:00.000Z',
    updated_at: '2026-09-12T10:30:00.000Z'
  }
];

const INITIAL_ORDERS: Order[] = [
  {
    order_id: 'ORD-CC-1001',
    customer_id: 'CUST-1001',
    customer: INITIAL_CUSTOMERS[0],
    product: {
      product_id: 'prod-001',
      product_name: 'CozyCup Classic Crochet Mug Cozy',
      category: 'Crochet',
      price: 85.00,
      currency: 'ZAR',
      image_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80'
    },
    quantity: 2,
    quoted_amount: 170.00,
    quote_breakdown: {
      order_id: 'ORD-CC-1001',
      product_id: 'prod-001',
      product_name: 'CozyCup Classic Crochet Mug Cozy',
      unit_price: 85.00,
      quantity: 2,
      subtotal: 170.00,
      packaging_delivery: 0.00,
      total_quoted_amount: 170.00,
      currency: 'ZAR',
      generated_at: '2026-09-12T10:35:00.000Z',
      valid_until: '2026-09-15T10:35:00.000Z'
    },
    order_status: 'Awaiting Payment',
    payment_status: 'Awaiting Payment',
    payment_details: {
      bank_name: 'FNB',
      account_name: 'Ms Roseane',
      account_number: '63179179370',
      branch_code: '250655',
      account_type: 'Cheque / Current',
      amount_due: 170.00,
      currency: 'ZAR',
      payment_reference: 'ORD-CC-1001',
      instructions: FNB_BANKING_DETAILS.statementNotice,
      proof_of_payment: null,
      payment_status: 'Awaiting Payment',
      submitted_at: null,
      verified_at: null,
      verified_by: null
    },
    item_category: 'Crochet',
    item_requested: 'CozyCup Classic Crochet Mug Cozy',
    colour: 'Purple',
    is_special_colour: false,
    estimated_completion_date: '2026-09-19T10:35:00.000Z',
    estimated_completion_note: "Estimated completion: 19 Sep 2026. This is an estimate — we'll update you if anything changes.",
    is_bigger_item: false,
    can_cancel: true,
    is_archived: false,
    archived_at: null,
    timeline: [
      {
        id: 'evt-1',
        status: 'Pending Quote',
        timestamp: '2026-09-12T10:35:00.000Z',
        note: 'Order initiated for 2x CozyCup Classic Crochet Mug Cozy. Calculated quote: R170.00.',
        actor: 'Customer'
      },
      {
        id: 'evt-2',
        status: 'Quote Sent',
        timestamp: '2026-09-12T10:35:05.000Z',
        note: 'System generated quote based on database price (R85.00/unit).',
        actor: 'System'
      },
      {
        id: 'evt-3',
        status: 'Awaiting Payment',
        timestamp: '2026-09-12T10:36:00.000Z',
        note: 'Customer accepted quotation. FNB banking details provided. Payment reference: ORD-CC-1001.',
        actor: 'Customer'
      }
    ],
    created_at: '2026-09-12T10:35:00.000Z',
    updated_at: '2026-09-12T10:36:00.000Z'
  }
];

const DEFAULT_SETTINGS: BusinessSettings = {
  email_notifications_enabled: true,
  calendar_sync_enabled: true,
  low_stock_threshold: 5
};

interface DatabaseSchema {
  customers: CustomerRecord[];
  products: Product[];
  orders: Order[];
  activeSessions: Record<string, { email: string; role: 'BUSINESS_OWNER'; expiresAt: number }>;
  ownerNotifications: OwnerNotification[];
  calendarEvents: CalendarEvent[];
  ownerSettings: BusinessSettings;
}

function ensureDatabase(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialDb: DatabaseSchema = {
      customers: INITIAL_CUSTOMERS,
      products: INITIAL_PRODUCTS,
      orders: INITIAL_ORDERS,
      activeSessions: {},
      ownerNotifications: [],
      calendarEvents: [],
      ownerSettings: { ...DEFAULT_SETTINGS }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!parsed.products || parsed.products.length === 0 || (parsed.products[0] as any).currency !== 'ZAR') {
      const initialDb: DatabaseSchema = {
        customers: INITIAL_CUSTOMERS,
        products: INITIAL_PRODUCTS,
        orders: INITIAL_ORDERS,
        activeSessions: {},
        ownerNotifications: [],
        calendarEvents: [],
        ownerSettings: { ...DEFAULT_SETTINGS }
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    if (!parsed.customers) parsed.customers = INITIAL_CUSTOMERS;
    if (!parsed.products) parsed.products = INITIAL_PRODUCTS;
    if (!parsed.orders) parsed.orders = INITIAL_ORDERS;
    if (!parsed.activeSessions) parsed.activeSessions = {};
    if (!parsed.ownerNotifications) parsed.ownerNotifications = [];
    if (!parsed.calendarEvents) parsed.calendarEvents = [];
    if (!parsed.ownerSettings) parsed.ownerSettings = { ...DEFAULT_SETTINGS };
    return parsed;
  } catch (err) {
    console.error('Error reading database file, recreating:', err);
    const initialDb: DatabaseSchema = {
      customers: INITIAL_CUSTOMERS,
      products: INITIAL_PRODUCTS,
      orders: INITIAL_ORDERS,
      activeSessions: {},
      ownerNotifications: [],
      calendarEvents: [],
      ownerSettings: { ...DEFAULT_SETTINGS }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }
}

function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database:', err);
  }
}

// Helper to determine customer cancellation permission
// "Allow customers to cancel their own order only when the order status is: Pending Quote, Quote Sent, Awaiting Payment"
function checkCanCancel(status: OrderStatus): boolean {
  return status === 'Pending Quote' || status === 'Quote Sent' || status === 'Awaiting Payment';
}

// ----------------------------------------------------
// Authentication Helpers & Middleware
// ----------------------------------------------------
function isAuthorizedOwnerEmail(email: string): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return AUTHORIZED_OWNER_EMAILS.map((e) => e.toLowerCase()).includes(normalized);
}

function requireBusinessOwner(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-owner-token'] as string);

  if (!token) {
    return res.status(403).json({
      error: 'Access denied: Business Owner authorization required.',
      code: 'UNAUTHORIZED_NOT_OWNER'
    });
  }

  const db = ensureDatabase();
  const session = db.activeSessions[token];

  if (!session || session.role !== 'BUSINESS_OWNER' || session.expiresAt < Date.now()) {
    return res.status(403).json({
      error: 'Session invalid or expired. Please log in as an authorized Business Owner.',
      code: 'SESSION_EXPIRED'
    });
  }

  // Attach owner session to request
  (req as any).ownerEmail = session.email;
  next();
}

// ----------------------------------------------------
// Google GenAI Lazy Initialization
// ----------------------------------------------------
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (aiClient) return aiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'cozycup-mvi'
        }
      }
    });
    return aiClient;
  } catch (err) {
    console.error('Error initializing GenAI:', err);
    return null;
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'CozyCup - Handmade Crochet & Bracelets',
    timestamp: new Date().toISOString()
  });
});

// ====================================================
// AUTHENTICATION ROUTES (Section 2.1 & 2.2)
// ====================================================
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide both email and password.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const isOwner = isAuthorizedOwnerEmail(normalizedEmail);

  if (isOwner) {
    // Grant Business Owner access
    const db = ensureDatabase();
    const token = 'owner_sess_' + crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    db.activeSessions[token] = {
      email: normalizedEmail,
      role: 'BUSINESS_OWNER',
      expiresAt
    };
    saveDatabase(db);

    const displayName = normalizedEmail.includes('roseane') ? 'Roseane Modise' : 'August Lionn';

    return res.json({
      role: 'BUSINESS_OWNER',
      email: normalizedEmail,
      name: displayName,
      token,
      message: 'Business Owner authentication successful. Redirecting to Owner Dashboard.'
    });
  } else {
    // Section 2.2: If not authorised, deny access and display exact error
    return res.status(403).json({
      error: 'This email is not authorised for Business Owner access.',
      role: 'CUSTOMER',
      email: normalizedEmail
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-owner-token'] as string);

  if (token) {
    const db = ensureDatabase();
    delete db.activeSessions[token];
    saveDatabase(db);
  }

  res.json({ message: 'Logged out successfully. Owner privileges cleared.' });
});

app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-owner-token'] as string);

  if (!token) {
    return res.json({ role: 'CUSTOMER', isAuthenticated: false });
  }

  const db = ensureDatabase();
  const session = db.activeSessions[token];

  if (session && session.expiresAt > Date.now()) {
    const displayName = session.email.includes('roseane') ? 'Roseane Modise' : 'August Lionn';
    return res.json({
      role: 'BUSINESS_OWNER',
      email: session.email,
      name: displayName,
      isAuthenticated: true
    });
  }

  res.json({ role: 'CUSTOMER', isAuthenticated: false });
});

// ====================================================
// PRODUCT ROUTES (Section 4.1)
// ====================================================
app.get('/api/products', (req, res) => {
  const db = ensureDatabase();
  res.json({ products: db.products });
});

app.get('/api/products/:id', (req, res) => {
  const db = ensureDatabase();
  const product = db.products.find((p) => p.product_id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Sorry, we could not find this product in the catalogue.' });
  }
  res.json({ product });
});

// ====================================================
// QUOTATION ROUTE (Section 4.2 & 5)
// ====================================================
app.post('/api/quote', (req, res) => {
  const { product_id, quantity } = req.body;
  const qty = parseInt(quantity, 10);

  if (!product_id || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Please specify a valid product and positive quantity.' });
  }

  const db = ensureDatabase();
  const product = db.products.find((p) => p.product_id === product_id);

  if (!product) {
    return res.status(404).json({ error: 'Sorry, this product is currently unavailable in the database.' });
  }

  if (product.stock_quantity < qty && product.availability_status !== 'Made to Order') {
    return res.status(400).json({
      error: `Insufficient stock. Only ${product.stock_quantity} item(s) currently available in database for ${product.product_name}.`,
      available_stock: product.stock_quantity
    });
  }

  const unit_price = product.price;
  const subtotal = Math.round(unit_price * qty * 100) / 100;
  const packaging_delivery = 0.00; // Free complimentary packaging for handmade items
  const total_quoted_amount = subtotal + packaging_delivery;
  const now = new Date();
  const valid_until = new Date(now.getTime() + 72 * 3600 * 1000);

  const quote: Quote = {
    product_id: product.product_id,
    product_name: product.product_name,
    unit_price,
    quantity: qty,
    subtotal,
    packaging_delivery,
    total_quoted_amount,
    currency: 'ZAR',
    generated_at: now.toISOString(),
    valid_until: valid_until.toISOString()
  };

  res.json({ quote, product });
});

// ====================================================
// ORDER CREATION WITH STRICT VALIDATION (Section 4.3, 4.4 & 4.5)
// ====================================================
app.post('/api/orders', (req, res) => {
  const {
    product_id,
    quantity,
    full_name,
    email,
    phone_number,
    item_category,
    item_requested,
    colour,
    popia_consent
  } = req.body;

  // 1. FULL NAME VALIDATION (Section 4.4)
  // "Must contain at least two words separated by a space"
  // "If invalid, display: 'Please enter your full name (e.g. John Smith).'"
  if (!full_name || typeof full_name !== 'string') {
    return res.status(400).json({ error: 'Please enter your full name (e.g. John Smith).' });
  }
  const trimmedName = full_name.trim();
  const words = trimmedName.split(/\s+/);
  if (words.length < 2 || words.some((w) => w.length === 0)) {
    return res.status(400).json({ error: 'Please enter your full name (e.g. John Smith).' });
  }

  // 2. PHONE NUMBER VALIDATION (Section 4.4)
  // "Must start with 0. Must contain exactly 10 digits. Must contain numbers only."
  // "If invalid, display exactly: 'Please ensure that you have entered your full number.'"
  if (!phone_number || typeof phone_number !== 'string') {
    return res.status(400).json({ error: 'Please ensure that you have entered your full number.' });
  }
  const cleanPhone = phone_number.trim().replace(/\s+/g, '');
  const isAllDigits = /^\d+$/.test(cleanPhone);
  if (!isAllDigits || cleanPhone.length !== 10 || !cleanPhone.startsWith('0')) {
    return res.status(400).json({ error: 'Please ensure that you have entered your full number.' });
  }

  // 3. EMAIL VALIDATION (Section 4.4)
  // "Must contain @ symbol and follow basic valid email structure"
  // "If invalid, display: 'Please enter a valid email address.'"
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  // 4. POPIA CONSENT VALIDATION (Section 16.1)
  if (!popia_consent) {
    return res.status(400).json({
      error: 'Please provide consent under POPIA to process your contact details for order quotation and dispatch.'
    });
  }

  // 5. QUANTITY VALIDATION
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be at least 1.' });
  }

  const db = ensureDatabase();

  // 6. PRODUCT EXISTENCE & AVAILABILITY
  const productIndex = db.products.findIndex((p) => p.product_id === product_id);
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Sorry, this product is currently unavailable.' });
  }

  const product = db.products[productIndex];
  if (product.stock_quantity < qty && product.availability_status !== 'Made to Order') {
    return res.status(400).json({
      error: `Sorry, this product only has ${product.stock_quantity} item(s) in stock.`,
      available_stock: product.stock_quantity
    });
  }

  // Determine item attributes
  const chosenCategory = (item_category || product.category || 'Crochet').trim();
  const chosenItemRequested = (item_requested || product.product_name || 'Handmade item').trim();
  const chosenColour = (colour || 'Purple').trim();

  // 7. PREVENT DUPLICATE ACCIDENTAL SUBMISSIONS WITHIN 30 SECONDS
  const recentDuplicate = db.orders.find(
    (o) =>
      o.customer.email.toLowerCase() === cleanEmail &&
      o.product.product_id === product_id &&
      o.quantity === qty &&
      Date.now() - new Date(o.created_at).getTime() < 30000
  );
  if (recentDuplicate) {
    return res.status(409).json({
      error: 'An identical order was just submitted. Please check your active order below.',
      order: recentDuplicate
    });
  }

  // 8. DEDUCT / RESERVE STOCK IN DATABASE
  if (product.stock_quantity >= qty) {
    db.products[productIndex].stock_quantity -= qty;
    if (db.products[productIndex].stock_quantity === 0) {
      db.products[productIndex].availability_status = 'Out of Stock';
    } else if (db.products[productIndex].stock_quantity <= 5) {
      db.products[productIndex].availability_status = 'Low Stock';
    }
  }

  // 9. REUSE OR CREATE CUSTOMER RECORD (Section 2.2 Customer Deduplication)
  // "1. The system checks whether a customer record already exists using:
  //    - Email address (primary matching field)
  //    - Phone number (secondary matching field)
  //  2. IF A MATCH IS FOUND: Do NOT create duplicate. Link new order to existing customer_id.
  //     Update customer record if any details changed. Set updated_at.
  //  3. PREVENT DUPLICATES: Same email never creates >1. Same phone never creates >1."
  let existingCustomer = db.customers.find(
    (c) => c.email.toLowerCase() === cleanEmail
  );

  if (!existingCustomer) {
    existingCustomer = db.customers.find(
      (c) => c.phone_number.replace(/\s+/g, '') === cleanPhone
    );
  }

  const nowIso = new Date().toISOString();
  let customer: CustomerRecord;

  if (existingCustomer) {
    existingCustomer.full_name = trimmedName;
    existingCustomer.email = cleanEmail;
    existingCustomer.phone_number = cleanPhone;
    existingCustomer.popia_consent = true;
    existingCustomer.updated_at = nowIso;
    customer = existingCustomer;
  } else {
    customer = {
      customer_id: 'CUST-' + Math.floor(10000 + Math.random() * 90000),
      full_name: trimmedName,
      email: cleanEmail,
      phone_number: cleanPhone,
      popia_consent: true,
      created_at: nowIso,
      updated_at: nowIso
    };
    db.customers.push(customer);
  }

  // 10. ESTIMATED COMPLETION DATE CALCULATION (Section 4.5)
  // - Item Size Classification (keyword matching)
  // - Weekly Cutoff Time (Sunday 9 PM)
  // - Materials Availability & Special Colour
  const isSpecialColour = isSpecialColourRequested(chosenColour);
  const estCompletion = calculateEstimatedCompletion(
    chosenCategory,
    chosenItemRequested,
    chosenColour,
    new Date(),
    product.stock_quantity < qty
  );

  // 11. GENERATE UNIQUE ORDER ID & CALCULATE QUOTE
  const orderId = 'ORD-CC-' + Math.floor(1000 + Math.random() * 9000);
  const unit_price = product.price;
  const subtotal = Math.round(unit_price * qty * 100) / 100;
  const total_quoted_amount = subtotal;

  const quote_breakdown: Quote = {
    order_id: orderId,
    product_id: product.product_id,
    product_name: product.product_name,
    unit_price,
    quantity: qty,
    subtotal,
    packaging_delivery: 0.00,
    total_quoted_amount,
    currency: 'ZAR',
    generated_at: nowIso,
    valid_until: new Date(Date.now() + 72 * 3600 * 1000).toISOString()
  };

  const payment_details: PaymentDetails = {
    bank_name: 'FNB',
    account_name: 'Ms Roseane',
    account_number: '63179179370',
    branch_code: '250655',
    account_type: 'Cheque / Current',
    amount_due: total_quoted_amount,
    currency: 'ZAR',
    payment_reference: orderId,
    instructions: FNB_BANKING_DETAILS.statementNotice,
    proof_of_payment: null,
    payment_status: 'Awaiting Payment',
    submitted_at: null,
    verified_at: null,
    verified_by: null
  };

  const newOrder: Order = {
    order_id: orderId,
    customer_id: customer.customer_id,
    customer,
    product: {
      product_id: product.product_id,
      product_name: product.product_name,
      category: product.category,
      price: product.price,
      currency: 'ZAR',
      image_url: product.image_url
    },
    quantity: qty,
    quoted_amount: total_quoted_amount,
    quote_breakdown,
    order_status: 'Pending Quote',
    payment_status: 'Awaiting Payment',
    payment_details,
    
    // Section 4.3 & 4.5 fields
    item_category: chosenCategory,
    item_requested: chosenItemRequested,
    colour: chosenColour,
    is_special_colour: isSpecialColour,
    estimated_completion_date: estCompletion.estimatedDate.toISOString(),
    estimated_completion_note: estCompletion.displayMessage,
    is_bigger_item: estCompletion.isBiggerItem,

    can_cancel: true,
    is_archived: false,
    archived_at: null,
    timeline: [
      {
        id: `evt-${Date.now()}-1`,
        status: 'Pending Quote',
        timestamp: nowIso,
        note: `Order initiated by ${trimmedName} for ${qty}x ${chosenItemRequested} (${chosenColour}). ${estCompletion.displayMessage}`,
        actor: 'Customer'
      }
    ],
    created_at: nowIso,
    updated_at: nowIso
  };

  db.orders.unshift(newOrder);
  saveDatabase(db);

  res.status(201).json({
    order: newOrder,
    message: 'Persistent order created in database with unique Order ID.'
  });
});

// ====================================================
// ACCEPT QUOTE (Section 5)
// "When accepted: Order Status -> Awaiting Payment"
// ====================================================
app.post('/api/orders/:id/accept-quote', (req, res) => {
  const db = ensureDatabase();
  const order = db.orders.find((o) => o.order_id === req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Sorry, we could not find an order with that Order ID. Please check the number and try again.' });
  }

  const nowIso = new Date().toISOString();
  order.order_status = 'Awaiting Payment';
  order.payment_status = 'Awaiting Payment';
  order.updated_at = nowIso;
  order.can_cancel = checkCanCancel(order.order_status);

  order.timeline.push({
    id: `evt-${Date.now()}-quote-accept`,
    status: 'Awaiting Payment',
    timestamp: nowIso,
    note: `Customer accepted the official quotation of R${order.quoted_amount.toFixed(2)}. FNB payment instructions unlocked.`,
    actor: 'Customer'
  });

  saveDatabase(db);

  res.json({
    order,
    message: 'Quotation accepted. Status updated to Awaiting Payment.'
  });
});

// ====================================================
// SUBMIT PROOF OF PAYMENT (Section 6 & Section 9.2)
// "Notifications and calendar events are triggered ONLY when:
//  - The customer has uploaded proof of payment, AND
//  - The order has been confirmed"
// ====================================================
app.post('/api/orders/:id/payment-proof', (req, res) => {
  const { reference_number, payer_name, file_name, notes } = req.body;

  if (!reference_number || !reference_number.trim()) {
    return res.status(400).json({ error: 'Please enter your bank transfer reference number.' });
  }

  const db = ensureDatabase();
  const order = db.orders.find((o) => o.order_id === req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Sorry, we could not find an order with that Order ID. Please check the number and try again.' });
  }

  const nowIso = new Date().toISOString();

  order.payment_details.proof_of_payment = {
    reference_number: reference_number.trim(),
    payer_name: payer_name?.trim() || order.customer.full_name,
    file_name: file_name || 'fnb_payment_slip.pdf',
    notes: notes?.trim() || '',
    submitted_at: nowIso
  };

  order.payment_status = 'Pending Verification';
  order.order_status = 'Pending Verification';
  order.payment_details.payment_status = 'Pending Verification';
  order.payment_details.submitted_at = nowIso;
  order.updated_at = nowIso;
  // Per Section 8: "Customers must NOT be able to cancel orders that are: Pending Verification, Paid, In Progress..."
  order.can_cancel = checkCanCancel(order.order_status);

  order.timeline.push({
    id: `evt-${Date.now()}-proof-submit`,
    status: 'Pending Verification',
    timestamp: nowIso,
    note: `Proof of payment submitted (FNB Reference: ${reference_number.trim()}). Payment is pending Business Owner verification.`,
    actor: 'Customer'
  });

  // Section 9.2: ORDER NOTIFICATIONS AND CALENDAR INTEGRATION
  // Trigger point: proof of payment uploaded + order confirmed
  const settings = db.ownerSettings || DEFAULT_SETTINGS;

  if (settings.email_notifications_enabled !== false) {
    const notif: OwnerNotification = {
      id: `notif-${Date.now()}`,
      order_id: order.order_id,
      type: 'PAYMENT_PROOF_UPLOADED',
      subject: `Payment Proof Uploaded: ${order.order_id} - ${order.customer.full_name}`,
      customer_name: order.customer.full_name,
      customer_email: order.customer.email,
      customer_phone: order.customer.phone_number,
      product_name: order.product.product_name,
      item_requested: order.item_requested || order.product.product_name,
      colour: order.colour || 'Standard',
      quantity: order.quantity,
      quoted_amount: order.quoted_amount,
      estimated_completion_date: order.estimated_completion_date,
      created_at: nowIso,
      read: false
    };
    if (!db.ownerNotifications) db.ownerNotifications = [];
    db.ownerNotifications.unshift(notif);
  }

  if (settings.calendar_sync_enabled !== false) {
    const calEvent: CalendarEvent = {
      id: `cal-${Date.now()}`,
      order_id: order.order_id,
      title: `Order ${order.order_id} ready - ${order.customer.full_name}`,
      description: `Customer: ${order.customer.full_name} (${order.customer.phone_number}, ${order.customer.email}). Product: ${order.quantity}x ${order.item_requested || order.product.product_name} (${order.colour}). Amount: R${order.quoted_amount.toFixed(2)}.`,
      date: order.estimated_completion_date,
      customer_name: order.customer.full_name,
      product_name: order.product.product_name,
      created_at: nowIso
    };
    if (!db.calendarEvents) db.calendarEvents = [];
    db.calendarEvents.push(calEvent);
  }

  saveDatabase(db);

  res.json({
    order,
    message: 'Proof of payment submitted. Payment is now Pending Verification by the Business Owner.'
  });
});

// ====================================================
// CUSTOMER ORDER TRACKING (Section 2.2 & Section 7)
// Customers can track their own order by Order ID
// Customers must NEVER see other customers' info
// To prevent data leakage, support email/phone matching verification
// ====================================================
app.get('/api/orders/:id', (req, res) => {
  const db = ensureDatabase();
  const order = db.orders.find((o) => o.order_id === req.params.id);

  if (!order) {
    return res.status(404).json({
      error: 'Sorry, we could not find an order with that Order ID. Please check the number and try again.'
    });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  const isOwner = token && db.activeSessions[token] && db.activeSessions[token].role === 'BUSINESS_OWNER';

  const contactQuery = (req.query.contact as string || '').trim().toLowerCase();

  // If a contact query is passed by the customer to verify ownership:
  if (contactQuery && !isOwner) {
    const cleanPhone = contactQuery.replace(/\s+/g, '');
    const orderPhone = order.customer.phone_number.replace(/\s+/g, '');
    const matchesEmail = order.customer.email.toLowerCase() === contactQuery;
    const matchesPhone = orderPhone === cleanPhone;

    if (!matchesEmail && !matchesPhone) {
      return res.status(403).json({
        error: 'The provided contact details do not match this Order ID. Please enter the email or phone number used when placing the order.',
        verified: false
      });
    }
  }

  // Safe response: Customer gets their own order details
  res.json({ order, verified: true });
});

// ====================================================
// CUSTOMER CANCELLATION (Section 8)
// Only when status is: Pending Quote, Quote Sent, Awaiting Payment
// ====================================================
app.post('/api/orders/:id/cancel', (req, res) => {
  const { reason } = req.body;
  const db = ensureDatabase();
  const order = db.orders.find((o) => o.order_id === req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Sorry, we could not find an order with that Order ID. Please check the number and try again.' });
  }

  if (!checkCanCancel(order.order_status)) {
    return res.status(400).json({
      error: 'This order can no longer be cancelled because work has already begun or payment has been verified. Please contact CozyCup for assistance.',
      can_cancel: false
    });
  }

  const nowIso = new Date().toISOString();
  order.order_status = 'Cancelled';
  order.payment_status = 'Cancelled';
  order.cancellation_reason = reason || 'Customer requested cancellation before payment verification.';
  order.cancelled_at = nowIso;
  order.can_cancel = false;
  order.updated_at = nowIso;

  // Restore inventory stock to database
  const productIndex = db.products.findIndex((p) => p.product_id === order.product.product_id);
  if (productIndex !== -1) {
    db.products[productIndex].stock_quantity += order.quantity;
    if (db.products[productIndex].stock_quantity > 0 && db.products[productIndex].availability_status === 'Out of Stock') {
      db.products[productIndex].availability_status = 'In Stock';
    }
  }

  order.timeline.push({
    id: `evt-${Date.now()}-cancelled`,
    status: 'Cancelled',
    timestamp: nowIso,
    note: `Order cancelled by customer. Reason: "${order.cancellation_reason}". Reserved items restored to inventory.`,
    actor: 'Customer'
  });

  saveDatabase(db);

  res.json({
    order,
    message: 'Order has been successfully cancelled and inventory units have been restored.'
  });
});

// ====================================================
// BUSINESS OWNER PROTECTED ROUTES (Sections 2.3, 6, 9 & 10)
// ====================================================

// 1. Owner Orders List (Active vs Archived)
app.get('/api/owner/orders', requireBusinessOwner, (req, res) => {
  const { tab = 'active', search = '', status = 'ALL' } = req.query;
  const db = ensureDatabase();

  let list = db.orders;

  if (tab === 'archived') {
    list = list.filter((o) => o.is_archived);
  } else {
    list = list.filter((o) => !o.is_archived);
  }

  if (status && status !== 'ALL') {
    list = list.filter((o) => o.order_status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(
      (o) =>
        o.order_id.toLowerCase().includes(q) ||
        o.customer.full_name.toLowerCase().includes(q) ||
        o.customer.email.toLowerCase().includes(q) ||
        o.product.product_name.toLowerCase().includes(q)
    );
  }

  const counts = {
    total_active: db.orders.filter((o) => !o.is_archived).length,
    pending_quotes: db.orders.filter((o) => !o.is_archived && o.order_status === 'Pending Quote').length,
    awaiting_payment: db.orders.filter((o) => !o.is_archived && o.order_status === 'Awaiting Payment').length,
    pending_verification: db.orders.filter((o) => !o.is_archived && o.order_status === 'Pending Verification').length,
    paid: db.orders.filter((o) => !o.is_archived && o.order_status === 'Paid').length,
    in_progress: db.orders.filter((o) => !o.is_archived && o.order_status === 'In Progress').length,
    completed: db.orders.filter((o) => !o.is_archived && o.order_status === 'Completed').length,
    cancelled: db.orders.filter((o) => !o.is_archived && o.order_status === 'Cancelled').length,
    archived: db.orders.filter((o) => o.is_archived).length
  };

  res.json({ orders: list, counts });
});

// 2. Owner Verifies Payment (Section 6 & 17)
// "The Business Owner must manually verify the payment.
// Only after verification: Payment Status -> Verified, Order Status -> Paid"
app.post('/api/owner/orders/:id/verify-payment', requireBusinessOwner, (req, res) => {
  const db = ensureDatabase();
  const order = db.orders.find((o) => o.order_id === req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found in database.' });
  }

  const nowIso = new Date().toISOString();
  order.payment_status = 'Verified';
  order.order_status = 'Paid';
  order.payment_details.payment_status = 'Verified';
  order.payment_details.verified_at = nowIso;
  order.payment_details.verified_by = (req as any).ownerEmail || 'Roseane Modise (Owner)';
  order.can_cancel = false; // Restricted once Paid
  order.updated_at = nowIso;

  order.timeline.push({
    id: `evt-${Date.now()}-payment-verified`,
    status: 'Paid',
    timestamp: nowIso,
    note: `Business Owner verified bank deposit of R${order.quoted_amount.toFixed(2)}. Payment Status set to Verified, Order Status set to Paid.`,
    actor: 'Business Owner'
  });

  saveDatabase(db);

  res.json({
    order,
    message: 'Payment verified successfully. Order status updated to Paid.'
  });
});

// 3. Owner Updates Order Status Through Lifecycle (Section 9 & 17)
// ('In Progress', 'Ready for Collection', 'Ready for Delivery', 'Completed')
app.post('/api/owner/orders/:id/status', requireBusinessOwner, (req, res) => {
  const { status, note } = req.body as { status: OrderStatus; note?: string };

  const validTransitions: OrderStatus[] = [
    'In Progress',
    'Ready for Collection',
    'Ready for Delivery',
    'Completed',
    'Cancelled'
  ];

  if (!validTransitions.includes(status)) {
    return res.status(400).json({ error: `Invalid status transition. Allowed: ${validTransitions.join(', ')}` });
  }

  const db = ensureDatabase();
  const order = db.orders.find((o) => o.order_id === req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const nowIso = new Date().toISOString();
  order.order_status = status;
  order.updated_at = nowIso;
  order.can_cancel = checkCanCancel(status);

  order.timeline.push({
    id: `evt-${Date.now()}-lifecycle`,
    status,
    timestamp: nowIso,
    note: note || `Business Owner updated order milestone to "${status}".`,
    actor: 'Business Owner'
  });

  saveDatabase(db);

  res.json({
    order,
    message: `Order milestone updated to ${status}.`
  });
});

// 4. Owner Archive Order (Section 10)
// "The owner can archive: Completed orders, Cancelled orders, Old fulfilled orders, Test orders"
app.post('/api/owner/orders/:id/archive', requireBusinessOwner, (req, res) => {
  const { archive = true } = req.body;
  const db = ensureDatabase();
  const order = db.orders.find((o) => o.order_id === req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const nowIso = new Date().toISOString();
  order.is_archived = !!archive;
  order.archived_at = archive ? nowIso : null;
  order.updated_at = nowIso;

  order.timeline.push({
    id: `evt-${Date.now()}-archived`,
    status: order.order_status,
    timestamp: nowIso,
    note: archive
      ? 'Order archived by Business Owner. Permanent record safely maintained in database.'
      : 'Order unarchived by Business Owner and restored to active view.',
    actor: 'Business Owner'
  });

  saveDatabase(db);

  res.json({
    order,
    message: archive
      ? 'Order archived. Permanent record remains securely in database.'
      : 'Order unarchived and returned to active view.'
  });
});

// 5. Owner Customer Records & History (Section 2.4 & 9)
// "Customers must never be able to view the customer database... Business Owner is the authorized role"
app.get('/api/owner/customers', requireBusinessOwner, (req, res) => {
  const db = ensureDatabase();

  const customerListWithOrders = db.customers.map((cust) => {
    const custOrders = db.orders.filter((o) => o.customer_id === cust.customer_id);
    const totalSpent = custOrders
      .filter((o) => o.order_status === 'Paid' || o.order_status === 'Completed')
      .reduce((acc, o) => acc + o.quoted_amount, 0);

    return {
      ...cust,
      order_count: custOrders.length,
      total_spent_zar: totalSpent,
      orders: custOrders.map((o) => ({
        order_id: o.order_id,
        product_name: o.product.product_name,
        quoted_amount: o.quoted_amount,
        order_status: o.order_status,
        created_at: o.created_at
      }))
    };
  });

  res.json({ customers: customerListWithOrders });
});

// 6. Owner Product Management (Add, Edit price, stock, availability)
app.post('/api/owner/products', requireBusinessOwner, (req, res) => {
  const { product_name, category, price, stock_quantity, availability_status, description, short_description, image_url, lead_time_days } = req.body;

  if (!product_name || !price) {
    return res.status(400).json({ error: 'Product name and price are required.' });
  }

  const db = ensureDatabase();
  const newProduct: Product = {
    product_id: 'prod-' + Math.floor(100 + Math.random() * 900),
    product_name: product_name.trim(),
    category: category || 'Crochet',
    price: parseFloat(price) || 0,
    currency: 'ZAR',
    stock_quantity: parseInt(stock_quantity, 10) || 0,
    availability_status: availability_status || 'In Stock',
    description: description || '',
    short_description: short_description || '',
    image_url: image_url || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    lead_time_days: parseInt(lead_time_days, 10) || 1,
    created_at: new Date().toISOString()
  };

  db.products.push(newProduct);
  saveDatabase(db);

  res.status(201).json({ product: newProduct, message: 'Product added successfully.' });
});

app.put('/api/owner/products/:id', requireBusinessOwner, (req, res) => {
  const db = ensureDatabase();
  const index = db.products.findIndex((p) => p.product_id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const existing = db.products[index];
  const { price, stock_quantity, availability_status, product_name, description, lead_time_days } = req.body;

  if (price !== undefined) existing.price = parseFloat(price);
  if (stock_quantity !== undefined) existing.stock_quantity = parseInt(stock_quantity, 10);
  if (availability_status) existing.availability_status = availability_status;
  if (product_name) existing.product_name = product_name.trim();
  if (description) existing.description = description;
  if (lead_time_days !== undefined) existing.lead_time_days = parseInt(lead_time_days, 10);
  existing.updated_at = new Date().toISOString();

  saveDatabase(db);
  res.json({ product: existing, message: 'Product updated successfully.' });
});

// 7. POPIA Customer PII Management (Section 16.1)
// "Provide an appropriate mechanism for the business owner to manage/delete personal information when no longer required"
app.delete('/api/owner/customers/:id/pii', requireBusinessOwner, (req, res) => {
  const db = ensureDatabase();
  const customer = db.customers.find((c) => c.customer_id === req.params.id);

  if (!customer) {
    return res.status(404).json({ error: 'Customer record not found.' });
  }

  // Anonymize personal data in accordance with POPIA retention guidelines
  customer.full_name = '[Anonymized Customer]';
  customer.email = `anonymized_${customer.customer_id}@popia.retention`;
  customer.phone_number = '0000000000';
  customer.updated_at = new Date().toISOString();

  // Also sanitize matching order records
  db.orders.forEach((o) => {
    if (o.customer_id === customer.customer_id) {
      o.customer.full_name = '[Anonymized Customer]';
      o.customer.email = customer.email;
      o.customer.phone_number = customer.phone_number;
    }
  });

  saveDatabase(db);
  res.json({ message: 'Customer personal information successfully anonymized in compliance with POPIA retention policy.' });
});

// 8. Owner Notifications (Section 9.2)
app.get('/api/owner/notifications', requireBusinessOwner, (req, res) => {
  const db = ensureDatabase();
  res.json({ notifications: db.ownerNotifications || [] });
});

app.put('/api/owner/notifications/:id/read', requireBusinessOwner, (req, res) => {
  const db = ensureDatabase();
  const notif = (db.ownerNotifications || []).find((n) => n.id === req.params.id);
  if (notif) notif.read = true;
  saveDatabase(db);
  res.json({ success: true, notification: notif });
});

// 9. Calendar Events Integration (Section 9.2)
app.get('/api/owner/calendar', requireBusinessOwner, (req, res) => {
  const db = ensureDatabase();
  res.json({ events: db.calendarEvents || [] });
});

app.post('/api/owner/calendar', requireBusinessOwner, (req, res) => {
  const db = ensureDatabase();
  const { order_id, title, description, date, customer_name, product_name } = req.body;
  if (!db.calendarEvents) db.calendarEvents = [];
  const newEvent: CalendarEvent = {
    id: `cal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    order_id: order_id || '',
    title: title || `Order ${order_id}`,
    description: description || '',
    date: date || new Date().toISOString(),
    customer_name: customer_name || '',
    product_name: product_name || '',
    created_at: new Date().toISOString()
  };
  db.calendarEvents.push(newEvent);
  saveDatabase(db);
  res.status(201).json({ event: newEvent });
});

// 10. Business Owner Settings (Section 9.2)
app.get('/api/owner/settings', requireBusinessOwner, (req, res) => {
  const db = ensureDatabase();
  res.json({ settings: db.ownerSettings || DEFAULT_SETTINGS });
});

app.put('/api/owner/settings', requireBusinessOwner, (req, res) => {
  const db = ensureDatabase();
  db.ownerSettings = {
    ...(db.ownerSettings || DEFAULT_SETTINGS),
    ...req.body
  };
  saveDatabase(db);
  res.json({ settings: db.ownerSettings, message: 'Settings saved successfully.' });
});

// ====================================================
// AI ASSISTANT CHAT ROUTE (Section 4, 14, 16.1 & 16.4)
// Supporting customer-service assistant with POPIA safeguards
// ====================================================
app.post('/api/assistant/chat', async (req, res) => {
  const { message, order_id } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Please enter a message.' });
  }

  const db = ensureDatabase();
  const lower = message.toLowerCase();

  // Strict POPIA & Privacy check (Section 2.4 & 16.1):
  // "For example, if a customer asks: 'Show me all your customers', 'What is another customer's phone number?'...
  // The AI must not provide the information and should explain that customer information is private."
  const privacyKeywords = [
    'all customer',
    'other customer',
    'customer list',
    'customer database',
    'another customer',
    'someone else',
    'show me customers',
    'all orders',
    'someone\'s phone',
    'phone number of',
    'who ordered',
    'customer records',
    'owner email',
    'owner login',
    'admin email',
    'owner credentials'
  ];

  const violatesPrivacy = privacyKeywords.some((kw) => lower.includes(kw));
  if (violatesPrivacy) {
    return res.json({
      reply:
        'Under our privacy policy and POPIA safeguards, all personal details, other customers\' orders, and administrative credentials are strictly confidential and cannot be disclosed.',
      suggestions: [
        'How do I place an order?',
        'What products do you have?',
        'How do I pay via FNB?'
      ]
    });
  }

  // Find referenced order if provided
  let foundOrder: Order | undefined;
  if (order_id) {
    foundOrder = db.orders.find((o) => o.order_id === order_id);
  } else {
    // Scan text for order ID pattern
    const match = message.match(/ORD-CC-\d{4}/i);
    if (match) {
      foundOrder = db.orders.find((o) => o.order_id.toUpperCase() === match[0].toUpperCase());
    }
  }

  const ai = getGenAI();
  if (ai) {
    try {
      const productCatalogSummary = db.products
        .map(
          (p) =>
            `- ${p.product_name} (${p.category}): R${p.price.toFixed(2)} | Stock: ${p.stock_quantity} (${p.availability_status}) | Lead time: ${p.lead_time_days} days`
        )
        .join('\n');

      const systemPrompt = `You are the friendly, helpful AI Business Assistant for "CozyCup", a small handmade crochet and bracelet boutique run by Ms Roseane.
Your role is a SUPPORTING help assistant.
IMPORTANT BUSINESS RULES:
1. Core ordering is completed visually via the application interface (Customer selects product -> Place Order -> Customer details -> Validate -> Confirm -> Quote -> FNB Payment). Customers do NOT have to place orders via conversational chat.
2. Prices and stock quantities must ONLY be retrieved from this live database summary:
${productCatalogSummary}
NEVER invent prices, stock counts, or products.
3. Banking Details:
Bank: FNB | Account Name: Ms Roseane | Account Number: 63179179370 | Branch Code: 250655 | Account Type: Cheque / Current.
Notice: "Please use your Order ID as the payment reference and upload proof of payment once payment has been made. Your order will only begin once payment has been verified."
4. Cancellation Rules:
Customers may only cancel their order when status is "Pending Quote", "Quote Sent", or "Awaiting Payment".
Once status is "Pending Verification", "Paid", "In Progress", "Ready for Collection", "Ready for Delivery", or "Completed", display: "This order can no longer be cancelled because work has already begun or payment has been verified. Please contact CozyCup for assistance."
5. POPIA PRIVACY RESTRICTIONS:
NEVER reveal other customers' personal information, phone numbers, emails, or orders. All customer data is private under POPIA.
6. HUMAN OVERSIGHT:
The Business Owner retains final authority over payment verification and order fulfillment.

${foundOrder ? `Current Customer Order Context:
Order ID: ${foundOrder.order_id}
Product: ${foundOrder.product.product_name} (x${foundOrder.quantity})
Status: ${foundOrder.order_status}
Payment Status: ${foundOrder.payment_status}
Quoted Amount: R${foundOrder.quoted_amount.toFixed(2)}
Can Cancel: ${foundOrder.can_cancel ? 'Yes' : 'No'}` : ''}

Respond kindly, accurately, and concisely in a warm handmade boutique tone.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nCustomer question: ${message}` }] }
        ]
      });

      const replyText = response.text || 'I am happy to help you with CozyCup products, pricing, and orders!';

      return res.json({
        reply: replyText,
        suggestions: [
          'What are your crochet mug cozy options?',
          'What are the FNB banking details?',
          'How do I track my order?'
        ],
        order_id: foundOrder?.order_id
      });
    } catch (err) {
      console.warn('Gemini API call failed, falling back to rule-based response:', err);
    }
  }

  // Rule-based Fallback Response if Gemini key is unset or offline
  let fallback = '';
  if (lower.includes('bank') || lower.includes('fnb') || lower.includes('pay')) {
    fallback = `Here are CozyCup's FNB banking details:\n\n` +
      `• Bank: FNB\n` +
      `• Account Name: Ms Roseane\n` +
      `• Account Number: 63179179370\n` +
      `• Branch Code: 250655\n` +
      `• Account Type: Cheque / Current\n\n` +
      `Please use your Order ID as the payment reference and upload your proof of payment once transfer is complete. Your order will begin once verified by Ms Roseane.`;
  } else if (lower.includes('cancel')) {
    fallback = `Cancellation Policy:\n` +
      `• You can cancel your order while it is in "Pending Quote", "Quote Sent", or "Awaiting Payment".\n` +
      `• Once payment has been submitted for verification or work has begun, self-cancellation is restricted. Please contact CozyCup for assistance.`;
  } else if (lower.includes('price') || lower.includes('cost') || lower.includes('bouquet') || lower.includes('cozy') || lower.includes('sunflower')) {
    fallback = `Here are our verified database prices:\n` +
      `• CozyCup Classic Crochet Mug Cozy: R85.00 (18 in stock)\n` +
      `• Handmade Crochet Sunflower Bouquet: R180.00 (8 in stock)\n` +
      `• Pastel Beaded Charm Bracelet: R65.00 (24 in stock)\n` +
      `• Personalized Letter Friendship Bracelet: R55.00 (35 in stock)\n` +
      `• Crochet Plushie Strawberry Keychain: R75.00 (14 in stock)\n` +
      `• Bespoke Custom Crochet & Bracelet Gift Bundle: R260.00 (Made to Order)\n\n` +
      `You can select any item on the homepage and click "Place Order" to get an instant quote!`;
  } else {
    fallback = `Welcome to CozyCup! I am your AI assistant. You can browse our handmade crochet and bracelet catalogue above and click "Place Order" to order directly without conversational chat.\n\n` +
      `Feel free to ask me about our current stock, FNB banking details, or your order status.`;
  }

  res.json({
    reply: fallback,
    suggestions: [
      'What are the FNB banking details?',
      'How does cancellation work?',
      'Which products are in stock?'
    ],
    order_id: foundOrder?.order_id
  });
});

// Demo Reset Endpoint
app.post('/api/demo/reset', (req, res) => {
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
  }
  const freshDb = ensureDatabase();
  res.json({ message: 'Database reset to fresh CozyCup seed data.', db: freshDb });
});

// ----------------------------------------------------
// Server Start & Vite Middleware Integration
// ----------------------------------------------------
async function startServer() {
  ensureDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CozyCup Handmade Boutique Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
