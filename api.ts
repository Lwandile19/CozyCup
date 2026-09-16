import {
  Product,
  Order,
  Quote,
  CustomerRecord,
  OrderStatus,
  BusinessOwnerSession,
  OwnerNotification,
  CalendarEvent,
  BusinessSettings
} from './types';

// Helper for Owner Auth Token
const TOKEN_KEY = 'cozycup_owner_token';
const OWNER_EMAIL_KEY = 'cozycup_owner_email';

export function getStoredOwnerToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredOwnerSession(): BusinessOwnerSession | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const email = localStorage.getItem(OWNER_EMAIL_KEY);
  if (!token || !email) return null;
  return {
    email,
    name: email.includes('roseane') ? 'Ms Roseane' : 'August Lion',
    role: 'BUSINESS_OWNER',
    token,
    loginAt: new Date().toISOString()
  };
}

export function setStoredOwnerSession(token: string, email: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(OWNER_EMAIL_KEY, email);
}

export function clearStoredOwnerSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(OWNER_EMAIL_KEY);
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredOwnerToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ----------------------------------------------------
// Authentication API
// ----------------------------------------------------
export async function loginOwner(email: string, password: string): Promise<{
  role: 'BUSINESS_OWNER' | 'CUSTOMER';
  email: string;
  name?: string;
  token?: string;
  message?: string;
}> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Authentication failed');

  if (data.role === 'BUSINESS_OWNER' && data.token) {
    setStoredOwnerSession(data.token, data.email);
  } else {
    clearStoredOwnerSession();
  }

  return data;
}

export async function logoutOwner(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders()
    });
  } finally {
    clearStoredOwnerSession();
  }
}

export async function verifyOwnerSession(): Promise<{
  isAuthenticated: boolean;
  role: 'BUSINESS_OWNER' | 'CUSTOMER';
  email?: string;
  name?: string;
}> {
  const token = getStoredOwnerToken();
  if (!token) return { isAuthenticated: false, role: 'CUSTOMER' };

  try {
    const res = await fetch('/api/auth/verify', {
      headers: getAuthHeaders()
    });
    if (!res.ok) return { isAuthenticated: false, role: 'CUSTOMER' };
    return await res.json();
  } catch {
    return { isAuthenticated: false, role: 'CUSTOMER' };
  }
}

// ----------------------------------------------------
// Products API
// ----------------------------------------------------
export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error('Failed to load CozyCup products');
  const data = await res.json();
  return data.products;
}

export async function fetchProductById(id: string): Promise<Product> {
  const res = await fetch(`/api/products/${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Product not found');
  return data.product;
}

// ----------------------------------------------------
// Quotation API
// ----------------------------------------------------
export async function calculateQuote(
  product_id: string,
  quantity: number
): Promise<{ quote: Quote; product: Product }> {
  const res = await fetch('/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id, quantity })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to calculate quote');
  return data;
}

// ----------------------------------------------------
// Order Creation API (Section 4.3, 4.4 & 4.5)
// ----------------------------------------------------
export async function createOrder(payload: {
  product_id: string;
  quantity: number;
  full_name: string;
  email: string;
  phone_number: string;
  item_category?: string;
  item_requested?: string;
  colour?: string;
  popia_consent: boolean;
}): Promise<{ order: Order; message: string }> {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create order');
  return data;
}

// ----------------------------------------------------
// Customer Accept Quote API
// ----------------------------------------------------
export async function acceptQuote(orderId: string): Promise<{ order: Order; message: string }> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/accept-quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to accept quote');
  return data;
}

// ----------------------------------------------------
// Customer Proof of Payment Submission
// ----------------------------------------------------
export async function submitPaymentProof(
  orderId: string,
  payload: {
    reference_number: string;
    payer_name?: string;
    file_name?: string;
    notes?: string;
  }
): Promise<{ order: Order; message: string }> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/payment-proof`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit payment proof');
  return data;
}

// ----------------------------------------------------
// Customer Order Tracking API (Section 2.2 & 7)
// Supports optional contact (email or phone) verification
// ----------------------------------------------------
export async function fetchOrderById(id: string, contact?: string): Promise<Order> {
  const url = `/api/orders/${encodeURIComponent(id)}${
    contact ? `?contact=${encodeURIComponent(contact)}` : ''
  }`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Order not found');
  return data.order;
}

// ----------------------------------------------------
// Customer Order Cancellation API
// ----------------------------------------------------
export async function cancelOrder(
  orderId: string,
  reason?: string
): Promise<{ order: Order; message: string }> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to cancel order');
  return data;
}

// ----------------------------------------------------
// Business Owner Protected APIs
// ----------------------------------------------------
export async function fetchOwnerOrders(
  tab: 'active' | 'archived' = 'active',
  search = '',
  status = 'ALL'
): Promise<{ orders: Order[]; counts: any }> {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  const res = await fetch(`/api/owner/orders?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch owner orders');
  return data;
}

export async function verifyPayment(orderId: string): Promise<{ order: Order; message: string }> {
  const res = await fetch(`/api/owner/orders/${encodeURIComponent(orderId)}/verify-payment`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to verify payment');
  return data;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string
): Promise<{ order: Order; message: string }> {
  const res = await fetch(`/api/owner/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, note })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update order status');
  return data;
}

export async function toggleArchiveOrder(
  orderId: string,
  archive: boolean
): Promise<{ order: Order; message: string }> {
  const res = await fetch(`/api/owner/orders/${encodeURIComponent(orderId)}/archive`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ archive })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to archive order');
  return data;
}

export async function fetchOwnerCustomers(): Promise<{ customers: any[] }> {
  const res = await fetch('/api/owner/customers', {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch customer records');
  return data;
}

export async function anonymizeCustomerPII(customerId: string): Promise<{ message: string }> {
  const res = await fetch(`/api/owner/customers/${encodeURIComponent(customerId)}/pii`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to anonymize customer data');
  return data;
}

export async function saveProduct(productData: Partial<Product>): Promise<{ product: Product; message: string }> {
  const res = await fetch('/api/owner/products', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(productData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save product');
  return data;
}

export async function updateProduct(
  productId: string,
  productData: Partial<Product>
): Promise<{ product: Product; message: string }> {
  const res = await fetch(`/api/owner/products/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(productData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update product');
  return data;
}

// ----------------------------------------------------
// AI Assistant API
// ----------------------------------------------------
export async function askAssistant(
  message: string,
  orderId?: string
): Promise<{ reply: string; suggestions?: string[]; order_id?: string }> {
  const res = await fetch('/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, order_id: orderId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'AI Assistant currently unavailable');
  return data;
}

export async function resetDemoData(): Promise<void> {
  await fetch('/api/demo/reset', { method: 'POST' });
}

export const resetDemoDatabase = resetDemoData;

// ----------------------------------------------------
// Section 9.2: Owner Notifications, Calendar & Settings API
// ----------------------------------------------------
export async function fetchOwnerNotifications(): Promise<{ notifications: OwnerNotification[] }> {
  try {
    const res = await fetch('/api/owner/notifications', { headers: getAuthHeaders() });
    if (!res.ok) return { notifications: [] };
    const data = await res.json();
    const list = Array.isArray(data) ? data : Array.isArray(data?.notifications) ? data.notifications : [];
    return { notifications: list };
  } catch (err) {
    console.warn('fetchOwnerNotifications error, defaulting to empty list:', err);
    return { notifications: [] };
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  await fetch(`/api/owner/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PUT',
    headers: getAuthHeaders()
  });
}

export async function fetchOwnerCalendar(): Promise<{ events: CalendarEvent[] }> {
  const res = await fetch('/api/owner/calendar', { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch calendar');
  return data;
}

export async function createCalendarEvent(
  eventData: Partial<CalendarEvent>
): Promise<{ event: CalendarEvent }> {
  const res = await fetch('/api/owner/calendar', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(eventData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create calendar event');
  return data;
}

export async function fetchOwnerSettings(): Promise<{ settings: BusinessSettings }> {
  const res = await fetch('/api/owner/settings', { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch settings');
  return data;
}

export async function updateOwnerSettings(
  settings: Partial<BusinessSettings>
): Promise<{ settings: BusinessSettings; message: string }> {
  const res = await fetch('/api/owner/settings', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(settings)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update settings');
  return data;
}
