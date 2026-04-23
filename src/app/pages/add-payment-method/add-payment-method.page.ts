import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { PaymentMethod, PaymentNetwork } from '../../core/models/payment.model';
import { MessageService } from '../../core/services/message.service';

@Component({
  selector: 'app-add-payment-method',
  templateUrl: './add-payment-method.page.html',
  styleUrls: ['./add-payment-method.page.scss'],
  standalone: false,
})
export class AddPaymentMethodPage {
  private fb = inject(FormBuilder);
  private paymentMethodService = inject(PaymentMethodService);
  private messageSvc = inject(MessageService);
  private router = inject(Router);

  isProcessing = false;
  detectedNetwork: PaymentNetwork = 'unknown';

  formData = this.fb.nonNullable.group({
    cardholderName: ['', [Validators.required, Validators.minLength(3)]],
    cardNumber: ['', [Validators.required]],
    expirationFormat: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])(\/\d{2})?$/)]],
    securityCode: ['', [Validators.required, Validators.pattern(/^\d{2,4}$/)]],
  });

  get previewPayment(): PaymentMethod {
    const digits = this.formData.controls.cardNumber.value.replace(/\D/g, '');
    const exp = this.formData.controls.expirationFormat.value;
    const sc = this.formData.controls.securityCode.value;
    const [mm, yy] = exp.includes('/') ? exp.split('/') : [exp, sc.slice(0, 2)];
    return {
      cardholderName: this.formData.controls.cardholderName.value || 'NOMBRE APELLIDO',
      cardNumber: digits,
      cardTail: digits.slice(-4).padStart(4, '•'),
      paymentNetwork: this.detectedNetwork,
      expirationMonth: parseInt(mm, 10) || 0,
      expirationYear: parseInt(yy, 10) || 0,
      availableBalance: 0,
      creationTimestamp: 0,
    };
  }

  get cardDigitsCount(): number {
    const value = this.formData.controls.cardNumber.value || '';
    return value.replace(/\s/g, '').length;
  }

  goBack(): void {
    this.router.navigateByUrl('/dashboard');
  }

  onCardNumberInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const formatted = PaymentMethodService.formatCardNumber(target.value);
    this.formData.controls.cardNumber.setValue(formatted, { emitEvent: false });
    target.value = formatted;
    this.detectedNetwork = PaymentMethodService.detectNetwork(formatted);
  }

  onExpirationInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    let v = target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
    this.formData.controls.expirationFormat.setValue(v, { emitEvent: false });
    target.value = v;
  }

  async handleSubmit(): Promise<void> {
    if (this.formData.invalid || this.isProcessing) {
      this.formData.markAllAsTouched();
      return;
    }
    const { cardholderName, cardNumber, expirationFormat, securityCode } = this.formData.getRawValue();
    const [mm, yyFromFormat] = expirationFormat.split('/');
    const yy = yyFromFormat ?? securityCode.slice(0, 2);
    this.isProcessing = true;
    try {
      await this.paymentMethodService.addPaymentMethod({
        cardholderName,
        cardNumber,
        expirationMonth: parseInt(mm, 10),
        expirationYear: 2000 + parseInt(yy, 10),
      });
      await this.messageSvc.success('Método de pago agregado');
      await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    } catch (e: unknown) {
      console.error('[AddPaymentMethod] error', e);
      const msg = (e as { message?: string })?.message ?? 'No se pudo agregar el método de pago';
      await this.messageSvc.error(msg);
    } finally {
      this.isProcessing = false;
    }
  }

}
