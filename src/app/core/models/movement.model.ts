export interface FinancialRecord {
  id?: string;
  paymentMethodId: string;
  methodCardTail: string;
  vendor: string;
  transactionAmount: number;
  timestamp: number;
  reactionEmoji?: string;
}
