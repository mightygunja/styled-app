/**
 * Payment Service
 * 
 * Handles payment processing for styling sessions using Stripe.
 * Mock implementation ready for Stripe integration.
 */

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'apple_pay' | 'google_pay';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  sessionId: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'refunded' | 'failed';
  description: string;
  sessionId?: string;
  stylistId?: string;
  createdAt: string;
  paymentMethod: PaymentMethod;
}

export interface PaymentSummary {
  totalSpent: number;
  totalSessions: number;
  averageSessionCost: number;
  recentTransactions: Transaction[];
}

class PaymentService {
  private paymentMethods: Map<string, PaymentMethod[]> = new Map();
  private transactions: Map<string, Transaction[]> = new Map();

  /**
   * Initialize Stripe (mock)
   */
  async initializeStripe(publishableKey: string): Promise<boolean> {
    // In production, would initialize Stripe SDK
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Stripe initialized (mock)');
    return true;
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(
    userId: string,
    cardNumber: string,
    expiryMonth: number,
    expiryYear: number,
    cvc: string
  ): Promise<PaymentMethod> {
    // In production, would use Stripe.js to tokenize card
    await new Promise(resolve => setTimeout(resolve, 1000));

    const paymentMethod: PaymentMethod = {
      id: `pm_${Date.now()}`,
      type: 'card',
      last4: cardNumber.slice(-4),
      brand: this.detectCardBrand(cardNumber),
      expiryMonth,
      expiryYear,
      isDefault: false,
    };

    const userMethods = this.paymentMethods.get(userId) || [];
    
    // Set as default if it's the first card
    if (userMethods.length === 0) {
      paymentMethod.isDefault = true;
    }
    
    userMethods.push(paymentMethod);
    this.paymentMethods.set(userId, userMethods);

    return paymentMethod;
  }

  /**
   * Get user's payment methods
   */
  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Return mock payment methods if none exist
    const methods = this.paymentMethods.get(userId);
    if (!methods || methods.length === 0) {
      const mockMethod: PaymentMethod = {
        id: 'pm_mock_1',
        type: 'card',
        last4: '4242',
        brand: 'Visa',
        expiryMonth: 12,
        expiryYear: 2025,
        isDefault: true,
      };
      this.paymentMethods.set(userId, [mockMethod]);
      return [mockMethod];
    }
    
    return methods;
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<boolean> {
    const methods = await this.getPaymentMethods(userId);
    
    methods.forEach(method => {
      method.isDefault = method.id === paymentMethodId;
    });
    
    this.paymentMethods.set(userId, methods);
    await new Promise(resolve => setTimeout(resolve, 300));
    return true;
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(userId: string, paymentMethodId: string): Promise<boolean> {
    const methods = await this.getPaymentMethods(userId);
    const filtered = methods.filter(m => m.id !== paymentMethodId);
    
    this.paymentMethods.set(userId, filtered);
    await new Promise(resolve => setTimeout(resolve, 300));
    return true;
  }

  /**
   * Create payment intent for session
   */
  async createPaymentIntent(
    sessionId: string,
    amount: number,
    currency: string = 'usd'
  ): Promise<PaymentIntent> {
    // In production, would call Stripe API
    await new Promise(resolve => setTimeout(resolve, 800));

    const intent: PaymentIntent = {
      id: `pi_${Date.now()}`,
      amount,
      currency,
      status: 'pending',
      sessionId,
      createdAt: new Date().toISOString(),
    };

    return intent;
  }

  /**
   * Confirm payment
   */
  async confirmPayment(
    userId: string,
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<{ success: boolean; transactionId?: string }> {
    // In production, would confirm with Stripe
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate success (95% success rate)
    const success = Math.random() > 0.05;

    if (success) {
      const transactionId = `txn_${Date.now()}`;
      return { success: true, transactionId };
    } else {
      return { success: false };
    }
  }

  /**
   * Process session payment
   */
  async processSessionPayment(
    userId: string,
    sessionId: string,
    stylistId: string,
    amount: number,
    description: string
  ): Promise<Transaction> {
    // Get payment method
    const methods = await this.getPaymentMethods(userId);
    const defaultMethod = methods.find(m => m.isDefault) || methods[0];

    if (!defaultMethod) {
      throw new Error('No payment method available');
    }

    // Create payment intent
    const intent = await this.createPaymentIntent(sessionId, amount);

    // Confirm payment
    const result = await this.confirmPayment(userId, intent.id, defaultMethod.id);

    if (!result.success) {
      throw new Error('Payment failed');
    }

    // Create transaction record
    const transaction: Transaction = {
      id: result.transactionId!,
      amount,
      currency: 'usd',
      status: 'completed',
      description,
      sessionId,
      stylistId,
      createdAt: new Date().toISOString(),
      paymentMethod: defaultMethod,
    };

    const userTransactions = this.transactions.get(userId) || [];
    userTransactions.push(transaction);
    this.transactions.set(userId, userTransactions);

    return transaction;
  }

  /**
   * Get user's transactions
   */
  async getTransactions(userId: string): Promise<Transaction[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const transactions = this.transactions.get(userId) || [];
    
    // Add mock transaction if none exist
    if (transactions.length === 0) {
      const mockTransaction: Transaction = {
        id: 'txn_mock_1',
        amount: 150,
        currency: 'usd',
        status: 'completed',
        description: 'Closet Audit Session with Emma Rodriguez',
        sessionId: 'test-session-1',
        stylistId: 'stylist-1',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: {
          id: 'pm_mock_1',
          type: 'card',
          last4: '4242',
          brand: 'Visa',
          isDefault: true,
        },
      };
      return [mockTransaction];
    }
    
    return transactions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get payment summary
   */
  async getPaymentSummary(userId: string): Promise<PaymentSummary> {
    const transactions = await this.getTransactions(userId);
    const completedTransactions = transactions.filter(t => t.status === 'completed');

    const totalSpent = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalSessions = completedTransactions.length;
    const averageSessionCost = totalSessions > 0 ? totalSpent / totalSessions : 0;

    return {
      totalSpent,
      totalSessions,
      averageSessionCost,
      recentTransactions: transactions.slice(0, 5),
    };
  }

  /**
   * Request refund
   */
  async requestRefund(transactionId: string, reason: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In production, would call Stripe refund API
    console.log(`Refund requested for ${transactionId}: ${reason}`);
    return true;
  }

  /**
   * Detect card brand from number
   */
  private detectCardBrand(cardNumber: string): string {
    const firstDigit = cardNumber.charAt(0);
    const firstTwo = cardNumber.substring(0, 2);

    if (firstDigit === '4') return 'Visa';
    if (['51', '52', '53', '54', '55'].includes(firstTwo)) return 'Mastercard';
    if (['34', '37'].includes(firstTwo)) return 'American Express';
    if (firstTwo === '60') return 'Discover';
    
    return 'Unknown';
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency: string = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  /**
   * Validate card number (Luhn algorithm)
   */
  validateCardNumber(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');
    
    if (digits.length < 13 || digits.length > 19) {
      return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i));

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }
}

export const paymentService = new PaymentService();
