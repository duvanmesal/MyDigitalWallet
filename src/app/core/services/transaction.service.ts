import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  orderBy,
  query,
  runTransaction,
  where,
} from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import { AuthenticationService } from './authentication.service';
import { PaymentMethod } from '../models/payment.model';
import { FinancialRecord } from '../models/movement.model';

const VENDORS = [
  'Amazon',
  'Netflix',
  'Spotify',
  'Uber',
  'Rappi',
  'Starbucks',
  'McDonald\'s',
  'Apple Store',
  'Steam',
  'Mercado Libre',
  'Éxito',
  'Carulla',
];

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private firestore = inject(Firestore);
  private auth = inject(AuthenticationService);

  /** Generates a fake vendor + amount (stand-in for faker.js). */
  static generateRandomVendorTransaction(): { vendor: string; transactionAmount: number } {
    const vendor = VENDORS[Math.floor(Math.random() * VENDORS.length)];
    const transactionAmount = Math.floor(Math.random() * 490_000) + 10_000;
    return { vendor, transactionAmount };
  }

  financialRecords$(paymentMethodId?: string): Observable<FinancialRecord[]> {
    return this.auth.user$.pipe(
      switchMap((u) => {
        if (!u) return of([] as FinancialRecord[]);
        const ref = collection(this.firestore, `users/${u.uid}/movements`);
        const q = paymentMethodId
          ? query(ref, where('paymentMethodId', '==', paymentMethodId), orderBy('timestamp', 'desc'))
          : query(ref, orderBy('timestamp', 'desc'));
        return collectionData(q, { idField: 'id' }) as Observable<FinancialRecord[]>;
      })
    );
  }

  /** Charges the payment method (atomic balance decrement) and logs the transaction. */
  async processPayment(paymentMethod: PaymentMethod, vendor: string, transactionAmount: number): Promise<string> {
    const user = this.auth.authenticatedUser;
    if (!user || !paymentMethod.id) throw new Error('No authenticated user / invalid payment method');
    if (transactionAmount <= 0) throw new Error('Monto inválido');

    const paymentRef = doc(this.firestore, `users/${user.uid}/payment-methods/${paymentMethod.id}`);
    await runTransaction(this.firestore, async (tx) => {
      const snap = await tx.get(paymentRef);
      if (!snap.exists()) throw new Error('Método de pago no encontrado');
      const current = snap.data()['availableBalance'] as number;
      if (current < transactionAmount) throw new Error('Saldo insuficiente');
      tx.update(paymentRef, { availableBalance: current - transactionAmount });
    });

    const movementData: Omit<FinancialRecord, 'id'> = {
      paymentMethodId: paymentMethod.id,
      methodCardTail: paymentMethod.cardTail,
      vendor,
      transactionAmount,
      timestamp: Date.now(),
    };
    const ref = await addDoc(
      collection(this.firestore, `users/${user.uid}/movements`),
      movementData
    );
    return ref.id;
  }

  async attachReactionEmoji(recordId: string, reactionEmoji: string): Promise<void> {
    const user = this.auth.authenticatedUser;
    if (!user) throw new Error('No authenticated user');
    const { updateDoc } = await import('@angular/fire/firestore');
    await updateDoc(doc(this.firestore, `users/${user.uid}/movements/${recordId}`), { reactionEmoji });
  }
}
