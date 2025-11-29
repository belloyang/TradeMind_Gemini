import { UserProfile } from "../types";

// INSTRUCTIONS FOR MONETIZATION:
// 1. Go to https://dashboard.stripe.com/test/products
// 2. Create a Product (e.g. "TradeMind Pro")
// 3. Create a Payment Link for that product
// 4. In the Payment Link settings, set the redirect URL after payment to:
//    https://your-domain.com?payment_success=true
// 5. Paste that link below.

// For Beta/Soft Launch, leave as null. The app handles this by simulating success or giving free access.
const STRIPE_PAYMENT_LINK = null; 

export class PaymentService {
  
  /**
   * redirect to Stripe Checkout
   */
  async initiateCheckout(user: UserProfile): Promise<void> {
    if (!STRIPE_PAYMENT_LINK) {
      // Soft Launch / Beta Mode Logic
      console.warn("No Stripe Link configured. Beta mode active.");
      // In a real app, you might show a toast here: "Pro features are free during beta!"
      return;
    }

    // Append client_reference_id to track which user is paying
    // const checkoutUrl = `${STRIPE_PAYMENT_LINK}?client_reference_id=${user.id}`;
    
    window.location.href = STRIPE_PAYMENT_LINK;
  }

  /**
   * Check URL for payment success flag (Standard Stripe redirect pattern)
   */
  checkPaymentSuccess(): boolean {
    const params = new URLSearchParams(window.location.search);
    return params.get('payment_success') === 'true';
  }
}

export const paymentService = new PaymentService();