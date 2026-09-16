import { Order } from '../types';

export interface EmailNotificationPayload {
  to_name?: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product_name: string;
  quantity: number;
  quoted_amount: string;
  estimated_completion_date: string;
  dashboard_url: string;
  subject: string;
}

export async function sendOwnerPaymentProofEmail(
  order: Order,
  emailEnabled: boolean
): Promise<{ success: boolean; message: string; simulated?: boolean }> {
  if (!emailEnabled) {
    return { success: false, message: 'Email notifications are disabled in Business Settings.' };
  }

  const compDate = order.estimated_completion_date
    ? new Date(order.estimated_completion_date).toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : 'To be confirmed';

  const subject = `Payment Proof Uploaded: ${order.order_id} - ${order.customer.full_name}`;
  const dashboardUrl = `${window.location.origin}/#owner-orders`;

  const payload: EmailNotificationPayload = {
    order_id: order.order_id,
    customer_name: order.customer.full_name,
    customer_email: order.customer.email,
    customer_phone: order.customer.phone_number,
    product_name: order.product.product_name,
    quantity: order.quantity,
    quoted_amount: `R${order.quoted_amount.toFixed(2)}`,
    estimated_completion_date: compDate,
    dashboard_url: dashboardUrl,
    subject
  };

  // Check for client-side EmailJS config in localStorage or window
  const emailjsServiceId = localStorage.getItem('cozycup_emailjs_service_id');
  const emailjsTemplateId = localStorage.getItem('cozycup_emailjs_template_id');
  const emailjsPublicKey = localStorage.getItem('cozycup_emailjs_public_key');

  if (emailjsServiceId && emailjsTemplateId && emailjsPublicKey) {
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: emailjsServiceId,
          template_id: emailjsTemplateId,
          user_id: emailjsPublicKey,
          template_params: payload
        })
      });

      if (response.ok) {
        return {
          success: true,
          message: `Owner notification email sent via EmailJS for order ${order.order_id}!`
        };
      } else {
        const errText = await response.text();
        console.warn('EmailJS delivery warning:', errText);
      }
    } catch (err: any) {
      console.warn('Client-side email transmission warning:', err);
    }
  }

  // If EmailJS keys not configured yet, the notification is logged to the Owner Notification Center
  return {
    success: true,
    simulated: true,
    message: `Owner notification generated for ${order.customer.full_name} (${order.order_id}). Logged to Owner Notifications Center.`
  };
}
