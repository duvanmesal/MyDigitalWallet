export type PaymentNetwork = 'visa' | 'mastercard' | 'unknown';

export interface PaymentMethod {
  id?: string;
  cardholderName: string;
  cardNumber: string;
  cardTail: string;
  paymentNetwork: PaymentNetwork;
  expirationMonth: number;
  expirationYear: number;
  availableBalance: number;
  creationTimestamp: number;
}
