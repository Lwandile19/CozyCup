import { Order } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';
import { createCalendarEvent } from '../api';

const GCAL_TOKEN_KEY = 'cozycup_gcal_token';
const GCAL_EXPIRES_KEY = 'cozycup_gcal_token_expires';

export function getStoredGCalToken(): string | null {
  const token = localStorage.getItem(GCAL_TOKEN_KEY);
  const expires = localStorage.getItem(GCAL_EXPIRES_KEY);
  if (!token) return null;
  if (expires && Number(expires) < Date.now()) {
    localStorage.removeItem(GCAL_TOKEN_KEY);
    localStorage.removeItem(GCAL_EXPIRES_KEY);
    return null;
  }
  return token;
}

export function setStoredGCalToken(token: string, expiresInSeconds: number = 3600) {
  localStorage.setItem(GCAL_TOKEN_KEY, token);
  localStorage.setItem(GCAL_EXPIRES_KEY, String(Date.now() + expiresInSeconds * 1000));
}

export function clearGCalToken() {
  localStorage.removeItem(GCAL_TOKEN_KEY);
  localStorage.removeItem(GCAL_EXPIRES_KEY);
}

// Request access token using Google Identity Services (GSI)
export function requestGoogleCalendarAccess(): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId = (firebaseConfig as any).oAuthClientId;
    if (!clientId) {
      return reject(new Error('Google OAuth Client ID is not configured.'));
    }

    const gsi = (window as any).google?.accounts?.oauth2;
    if (!gsi) {
      // If GSI script isn't loaded yet, try dynamically loading
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => {
        const loadedGsi = (window as any).google?.accounts?.oauth2;
        if (!loadedGsi) {
          return reject(new Error('Google Identity Services unavailable.'));
        }
        initAndRequestToken(loadedGsi, clientId, resolve, reject);
      };
      script.onerror = () => reject(new Error('Failed to load Google Identity Services library.'));
      document.head.appendChild(script);
      return;
    }

    initAndRequestToken(gsi, clientId, resolve, reject);
  });
}

function initAndRequestToken(
  gsi: any,
  clientId: string,
  resolve: (token: string) => void,
  reject: (err: any) => void
) {
  try {
    const tokenClient = gsi.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      callback: (tokenResponse: any) => {
        if (tokenResponse.error) {
          return reject(new Error(tokenResponse.error_description || tokenResponse.error));
        }
        if (tokenResponse.access_token) {
          setStoredGCalToken(tokenResponse.access_token, tokenResponse.expires_in || 3600);
          resolve(tokenResponse.access_token);
        } else {
          reject(new Error('No access token received from Google.'));
        }
      }
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  } catch (err) {
    reject(err);
  }
}

/**
 * Triggered ONLY when proof of payment is uploaded and the order is confirmed
 */
export async function syncOrderToGoogleCalendar(
  order: Order,
  calendarSyncEnabled: boolean
): Promise<{ success: boolean; eventId?: string; message: string }> {
  if (!calendarSyncEnabled) {
    return { success: false, message: 'Calendar synchronization is turned off in Business Settings.' };
  }

  // Format date: YYYY-MM-DD
  const compDate = order.estimated_completion_date
    ? new Date(order.estimated_completion_date).toISOString().split('T')[0]
    : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const title = `Order ${order.order_id} ready - ${order.customer.full_name}`;
  const description =
    `CozyCup Order Ready\n` +
    `Order ID: ${order.order_id}\n` +
    `Customer: ${order.customer.full_name}\n` +
    `Phone: ${order.customer.phone_number}\n` +
    `Email: ${order.customer.email}\n` +
    `Item: ${order.product.product_name} (x${order.quantity})\n` +
    `Colour: ${order.colour || 'Standard'}\n` +
    `Quoted Amount: R${order.quoted_amount.toFixed(2)}\n` +
    `Payment Status: ${order.payment_status}\n` +
    `Notes: ${order.estimated_completion_note || 'Completed per schedule.'}`;

  // Always sync with the app's internal calendar list
  try {
    await createCalendarEvent({
      order_id: order.order_id,
      title,
      description,
      date: order.estimated_completion_date || new Date().toISOString(),
      customer_name: order.customer.full_name,
      product_name: order.product.product_name
    });
  } catch (syncErr) {
    console.warn('Local calendar sync notice:', syncErr);
  }

  // Check if owner has Google Calendar access token
  const token = getStoredGCalToken();
  if (!token) {
    return {
      success: true,
      message: 'Event added to CozyCup calendar. (Connect Google account in settings to sync to personal Google Calendar).'
    };
  }

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: title,
        description,
        start: { date: compDate },
        end: { date: compDate }
      })
    });

    if (!res.ok) {
      if (res.status === 401) {
        clearGCalToken();
      }
      return {
        success: false,
        message: 'Google Calendar API returned an authorization error. Please reconnect in Business Settings.'
      };
    }

    const data = await res.json();
    return {
      success: true,
      eventId: data.id,
      message: `Event synchronized to Google Calendar for ${compDate}!`
    };
  } catch (err: any) {
    console.error('Google Calendar event creation error:', err);
    return {
      success: false,
      message: err.message || 'Failed to sync with Google Calendar API.'
    };
  }
}
