import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { TransactionService } from '../../core/services/transaction.service';
import { MessageService } from '../../core/services/message.service';
import { ProgressService } from '../../core/services/progress.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { SecurityService } from '../../core/services/security.service';
import { AuthenticationService } from '../../core/services/authentication.service';
import { AlertService } from '../../core/services/alert.service';
import { PaymentMethod } from '../../core/models/payment.model';

@Component({
  selector: 'app-transaction',
  templateUrl: './transaction.page.html',
  styleUrls: ['./transaction.page.scss'],
  standalone: false,
})
export class TransactionPage implements OnInit {
  private fb = inject(FormBuilder);
  private paymentMethodService = inject(PaymentMethodService);
  private transactionService = inject(TransactionService);
  private messageSvc = inject(MessageService);
  private progressSvc = inject(ProgressService);
  private confirmationSvc = inject(ConfirmationService);
  private security = inject(SecurityService);
  private auth = inject(AuthenticationService);
  private alertSvc = inject(AlertService);
  private router = inject(Router);

  paymentMethods$: Observable<PaymentMethod[]> = this.paymentMethodService.paymentMethods$();
  selectedPayment: PaymentMethod | null = null;

  quickAmounts = [20_000, 50_000, 100_000, 200_000];
  quickVendors = ['Netflix', 'Spotify', 'Amazon', 'Uber', 'Rappi', 'Starbucks'];

  formData = this.fb.nonNullable.group({
    paymentMethodId: ['', Validators.required],
    vendor: ['', [Validators.required, Validators.minLength(2)]],
    transactionAmount: [0, [Validators.required, Validators.min(1000)]],
  });

  async ngOnInit(): Promise<void> {
    const methods = await firstValueFrom(this.paymentMethods$);
    if (methods.length > 0) {
      this.formData.patchValue({ paymentMethodId: methods[0].id });
      this.selectedPayment = methods[0];
    }

    this.formData.controls.paymentMethodId.valueChanges.subscribe(async (id) => {
      const all = await firstValueFrom(this.paymentMethods$);
      this.selectedPayment = all.find((m) => m.id === id) ?? null;
    });
  }

  selectCard(m: PaymentMethod): void {
    this.formData.patchValue({ paymentMethodId: m.id });
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }

  setQuickAmount(amount: number): void {
    this.formData.patchValue({ transactionAmount: amount });
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }

  setVendor(vendor: string): void {
    this.formData.patchValue({ vendor });
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }

  handleRandomize(): void {
    const { vendor, transactionAmount } = TransactionService.generateRandomVendorTransaction();
    this.formData.patchValue({ vendor, transactionAmount });
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }

  goBack(): void {
    this.router.navigateByUrl('/dashboard');
  }

  trackById(_: number, m: PaymentMethod): string {
    return m.id ?? m.cardTail;
  }

  async handleSubmit(): Promise<void> {
    if (this.formData.invalid) {
      this.formData.markAllAsTouched();
      return;
    }
    const methods = await firstValueFrom(this.paymentMethods$);
    const method = methods.find((m) => m.id === this.formData.controls.paymentMethodId.value);
    if (!method) {
      await this.messageSvc.error('Selecciona un método válido');
      return;
    }
    const { vendor, transactionAmount } = this.formData.getRawValue();

    const accepted = await this.confirmationSvc.confirm({
      header: 'Confirmar Transacción',
      message: `¿Realizar pago de $${transactionAmount.toLocaleString('es-CO')} a ${vendor} con la tarjeta •••• ${method.cardTail}?`,
      acceptText: 'Transaccionar',
    });
    if (!accepted) return;

    const user = this.auth.authenticatedUser;
    if (user) {
      const profile = await this.auth.getProfile(user.uid);
      if (profile?.biometryActivated) {
        const verified = await this.security.verify('Autoriza tu transacción');
        if (!verified) {
          await this.messageSvc.error('Transacción no autorizada');
          return;
        }
      }
    }

    try {
      await this.progressSvc.executeWithProgress(
        () => this.transactionService.processPayment(method, vendor, transactionAmount),
        'Procesando transacción...'
      );
      Haptics.notification({ type: NotificationType.Success }).catch(() => {});
      await this.messageSvc.success(`Pago a ${vendor} exitoso`);
      this.alertSvc
        .sendTransactionSuccessAlert(vendor, transactionAmount)
        .catch((e) => console.error('[Push] send', e));
      await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    } catch (e: unknown) {
      Haptics.notification({ type: NotificationType.Error }).catch(() => {});
      const msg = (e as { message?: string })?.message ?? 'No se pudo procesar la transacción';
      await this.messageSvc.error(msg);
    }
  }
}
