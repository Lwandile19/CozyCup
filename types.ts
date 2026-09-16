/**
 * CozyCup - Handmade Crochet & Bracelets MVI Types
 */

export type OrderStatus =
  | 'Pending Quote'
  | 'Quote Sent'
  | 'Awaiting Payment'
  | 'Pending Verification'
  | 'Paid'
  | 'In Progress'
  | 'Ready for Collection'
  | 'Ready for Delivery'
  | 'Completed'
  | 'Cancelled'
  | 'Archived';

export type PaymentStatus =
  | 'Unpaid'
  | 'Awaiting Payment'
  | 'Pending Verification'
  | 'Verified'
  | 'Cancelled';

export interface CustomerRecord {
  customer_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  popia_consent: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  product_id: string;
  product_name: string;
  category: 'Crochet' | 'Bracelets' | 'Custom Orders' | string;
  description: string;
  short_description: string;
  price: number; // in ZAR (Rands)
  currency?: 'ZAR';
  stock_quantity: number;
  availability_status: 'In Stock' | 'Low Stock' | 'Made to Order' | 'Out of Stock';
  image_url: string;
  lead_time_days: number;
  featured?: boolean;
  is_featured?: boolean;
  is_quick_order?: boolean;
  active?: boolean;
  materials_used?: Array<{
    material_id: string;
    material_name: string;
    quantity_per_unit: number;
    unit: string;
  }>;
  linked_material_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItem {
  id?: string;
  material_id?: string;
  item_name?: string;
  name?: string;
  category: 'Yarn' | 'Thread' | 'Beads' | 'Hardware' | 'Charms & Clasps' | 'Packaging' | 'Other' | string;
  quantity: number;
  unit: string; // 'skeins', 'grams', 'packs', 'units', 'meters'
  low_stock_threshold?: number;
  min_threshold?: number;
  cost_per_unit?: number;
  notes?: string;
  linked_product_ids?: string[];
  updated_at?: string;
}

export interface Quote {
  order_id?: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  packaging_delivery: number;
  total_quoted_amount: number;
  currency: 'ZAR';
  generated_at: string;
  valid_until: string;
}

export interface PaymentDetails {
  bank_name: 'FNB';
  account_name: 'Ms Roseane';
  account_number: '63179179370';
  branch_code: '250655';
  account_type: 'Cheque / Current';
  amount_due: number;
  currency: 'ZAR';
  payment_reference: string; // Order ID
  instructions: string;
  proof_of_payment?: {
    reference_number: string;
    payer_name: string;
    file_name: string;
    notes?: string;
    submitted_at: string;
  } | null;
  payment_status: PaymentStatus;
  submitted_at?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
}

export interface TimelineEvent {
  id: string;
  status: OrderStatus;
  timestamp: string;
  note: string;
  actor: 'Customer' | 'Business Owner' | 'System';
}

export interface Order {
  order_id: string;
  customer_id: string;
  customer: CustomerRecord;
  product: {
    product_id: string;
    product_name: string;
    category: string;
    price: number;
    currency: 'ZAR';
    image_url: string;
  };
  quantity: number;
  quoted_amount: number;
  quote_breakdown: Quote;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  payment_details: PaymentDetails;
  
  // Section 4.3 & 4.5 additions
  item_category: string;
  item_requested: string;
  colour: string;
  is_special_colour: boolean;
  estimated_completion_date: string;
  estimated_completion_note: string;
  is_bigger_item?: boolean;
  
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  can_cancel: boolean;
  is_quick_order?: boolean;
  order_type?: 'standard' | 'quick' | 'custom' | string;
  is_archived: boolean;
  archived?: boolean;
  archived_at?: string | null;
  timeline: TimelineEvent[];
  created_at: string;
  updated_at: string;
}

export interface BusinessOwnerSession {
  email: string;
  role: 'BUSINESS_OWNER';
  token: string;
  name: string;
  loginAt: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
  referenced_order_id?: string;
}

// Section 9.2: Owner Notifications & Calendar Integration
export interface OwnerNotification {
  id: string;
  order_id: string;
  type: 'PAYMENT_PROOF_UPLOADED';
  subject: string;
  title?: string;
  message?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product_name: string;
  item_requested: string;
  colour: string;
  quantity: number;
  quoted_amount: number;
  estimated_completion_date: string;
  created_at: string;
  read: boolean;
}

export interface CalendarEvent {
  id: string;
  order_id: string;
  title: string; // "Order [Order ID] ready - [Customer Name]"
  description: string;
  date: string; // Estimated completion date
  scheduled_date?: string;
  customer_name: string;
  product_name: string;
  created_at: string;
}

export interface BusinessSettings {
  email_notifications_enabled: boolean;
  calendar_sync_enabled: boolean;
  low_stock_threshold: number; // default 5
  owner_email?: string;
  notify_on_payment_proof?: boolean;
  notify_on_order_confirmed?: boolean;
  calendar_reminders?: boolean;
  google_calendar_sync?: boolean;
}

export const DEFAULT_SETTINGS: BusinessSettings = {
  email_notifications_enabled: true,
  calendar_sync_enabled: true,
  low_stock_threshold: 5,
  owner_email: 'owner@cozycup.co.za',
  notify_on_payment_proof: true,
  notify_on_order_confirmed: true,
  calendar_reminders: true,
  google_calendar_sync: false
};

export const STANDARD_COLOURS = [
  'Black',
  'White',
  'Blue',
  'Purple',
  'Pink'
] as const;

export const FNB_BANKING_DETAILS = {
  bankName: 'FNB',
  accountName: 'Ms Roseane',
  accountNumber: '63179179370',
  branchCode: '250655',
  accountType: 'Cheque / Current',
  statementNotice:
    'Please use your Order ID as the payment reference and upload proof of payment once payment has been made. Your order will only begin once payment has been verified.'
};
