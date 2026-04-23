import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  orderBy,
  query,
} from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import { AuthenticationService } from './authentication.service';
import { PaymentMethod, PaymentNetwork } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentMethodService {
  private firestore = inject(Firestore);
  private auth = inject(AuthenticationService);
  private injector = inject(Injector);

  /** Luhn algorithm — validates card number integrity. */
  static luhnValidation(raw: string): boolean {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 12 || digits.length > 19) return false;
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = parseInt(digits[i], 10);
      if (alt) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0 && sum > 0;
  }

  /** BIN-based brand detection (Visa, Mastercard). */
  static detectNetwork(raw: string): PaymentNetwork {
    const d = raw.replace(/\D/g, '');
    if (!d) return 'unknown';
    if (d.startsWith('4')) return 'visa';
    const two = parseInt(d.slice(0, 2), 10);
    if (two >= 51 && two <= 55) return 'mastercard';
    const four = parseInt(d.slice(0, 4), 10);
    if (four >= 2221 && four <= 2720) return 'mastercard';
    return 'unknown';
  }

  /** Format as 4-digit blocks (e.g. "4111 1111 1111 1111"). */
  static formatCardNumber(raw: string): string {
    return raw.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
  }

  paymentMethods$(): Observable<PaymentMethod[]> {
    return this.auth.user$.pipe(
      switchMap((u) => {
        if (!u) return of([] as PaymentMethod[]);
        return runInInjectionContext(this.injector, () => {
          const ref = collection(this.firestore, `users/${u.uid}/payment-methods`);
          return collectionData(query(ref, orderBy('creationTimestamp', 'desc')), {
            idField: 'id',
          }) as Observable<PaymentMethod[]>;
        });
      })
    );
  }

  async addPaymentMethod(input: {
    cardholderName: string;
    cardNumber: string;
    expirationMonth: number;
    expirationYear: number;
  }): Promise<string> {
    const user = this.auth.authenticatedUser;
    if (!user) throw new Error('No authenticated user');
    const digits = input.cardNumber.replace(/\D/g, '');
    if (!PaymentMethodService.luhnValidation(digits)) throw new Error('Número de tarjeta inválido (Luhn)');
    const network = PaymentMethodService.detectNetwork(digits);
    if (network === 'unknown') throw new Error('Solo se aceptan Visa o Mastercard');

    const paymentMethod: Omit<PaymentMethod, 'id'> = {
      cardholderName: input.cardholderName.trim().toUpperCase(),
      cardNumber: digits,
      cardTail: digits.slice(-4),
      paymentNetwork: network,
      expirationMonth: input.expirationMonth,
      expirationYear: input.expirationYear,
      availableBalance: 0,
      creationTimestamp: Date.now(),
    };
    const ref = await addDoc(collection(this.firestore, `users/${user.uid}/payment-methods`), paymentMethod);
    return ref.id;
  }

  async updatePaymentMethod(paymentMethodId: string, data: Partial<PaymentMethod>): Promise<void> {
    const user = this.auth.authenticatedUser;
    if (!user) throw new Error('No authenticated user');
    const { updateDoc: update } = await import('@angular/fire/firestore');
    await update(doc(this.firestore, `users/${user.uid}/payment-methods/${paymentMethodId}`), data);
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    const user = this.auth.authenticatedUser;
    if (!user) throw new Error('No authenticated user');
    await deleteDoc(doc(this.firestore, `users/${user.uid}/payment-methods/${paymentMethodId}`));
  }
}
