
import { UserProfile } from "../types";

// Replace with your actual Stripe Payment Link when ready
// e.g., "https://buy.stripe.com/..."
// For Beta/Soft Launch, we can leave it null or use a placeholder
const STRIPE_PAYMENT_LINK = null; 

export class PaymentService {
  
  /**
   * redirect to Stripe Checkout
   */
  async initiateCheckout(user: UserProfile): Promise<void> {
    if (!STRIPE_PAYMENT_LINK) {
      // Soft Launch Mode
      console.warn("No Stripe Link configured. simulating upgrade.");
      return;
    }

    // Append user ID or email to the URL for tracking if needed
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
