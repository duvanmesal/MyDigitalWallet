import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AuthenticationService } from '../../core/services/authentication.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { SecurityService } from '../../core/services/security.service';
import { DatabaseService } from '../../core/services/database.service';
import { MessageService } from '../../core/services/message.service';
import { AlertService } from '../../core/services/alert.service';
import { TransactionService } from '../../core/services/transaction.service';
import { PaymentMethod } from '../../core/models/payment.model';
import { FinancialRecord } from '../../core/models/movement.model';

interface MainAction {
  key: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {
  private auth = inject(AuthenticationService);
  private paymentMethodService = inject(PaymentMethodService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private security = inject(SecurityService);
  private databaseSvc = inject(DatabaseService);
  private messageSvc = inject(MessageService);
  private alertSvc = inject(AlertService);
  private transactionSvc = inject(TransactionService);

  showBalance = true;
  biometryAvailable = false;
  biometryEnabled = false;
  selectedCard: PaymentMethod | null = null;

  // Edit modal
  editingPayment: PaymentMethod | null = null;
  editFormName = '';

  // Recharge modal
  rechargingPayment: PaymentMethod | null = null;
  rechargeAmount = 0;
  quickRechargeAmounts = [50_000, 100_000, 200_000, 500_000];

  mainActions: MainAction[] = [
    { key: 'add', label: 'Agregar', icon: 'add-circle-outline' },
    { key: 'pay', label: 'Transaccionar', icon: 'card-outline' },
    { key: 'history', label: 'Historial', icon: 'time-outline' },
  ];

  paymentMethods$: Observable<PaymentMethod[]> = this.paymentMethodService.paymentMethods$().pipe(
    tap(methods => {
      if (methods.length === 0) {
        this.selectedCard = null;
      } else if (!this.selectedCard) {
        this.selectedCard = methods[0];
      } else {
        this.selectedCard = methods.find(m => m.cardTail === this.selectedCard?.cardTail) ?? methods[0];
      }
    })
  );
  totalBalance$: Observable<number> = this.paymentMethods$.pipe(
    map((methods) => methods.reduce((acc, m) => acc + (m.availableBalance || 0), 0))
  );
  displayName$: Observable<string> = this.auth.user$.pipe(
    map((u) => u?.displayName || u?.email?.split('@')[0] || 'Cliente')
  );
  recentTransactions$: Observable<FinancialRecord[]> = this.transactionSvc.financialRecords$().pipe(
    map((records) => records.slice(0, 3))
  );

  async ngOnInit(): Promise<void> {
    this.biometryAvailable = await this.security.isAvailable();
    const user = this.auth.authenticatedUser;
    if (user) {
      const profile = await this.auth.getProfile(user.uid);
      this.biometryEnabled = !!profile?.biometryActivated;
    }
    this.alertSvc.initializePushNotifications().catch((e) => console.error('[Push] initialize', e));
  }

  handleBalanceToggle(): void {
    this.showBalance = !this.showBalance;
  }

  selectCard(m: PaymentMethod): void {
    this.selectedCard = m;
  }

  async handleBiometryToggle(): Promise<void> {
    const user = this.auth.authenticatedUser;
    if (!user?.email) return;

    if (this.biometryEnabled) {
      await this.security.removeSecurityCredentials();
      await this.databaseSvc.updateDocument(`users/${user.uid}`, { biometryActivated: false });
      this.biometryEnabled = false;
      await this.messageSvc.success('Biometría desactivada');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Activar Biometría',
      message: 'Confirma tu contraseña para vincular tu huella o FaceID.',
      inputs: [{ name: 'accessPassword', type: 'password', placeholder: 'Contraseña' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Activar',
          handler: async (data) => {
            const password = (data?.accessPassword ?? '').trim();
            if (!password) return false;
            try {
              await this.auth.login(user.email!, password);
              const ok = await this.security.verify('Vincula tu biometría');
              if (!ok) {
                await this.messageSvc.error('Verificación biométrica cancelada');
                return false;
              }
              await this.security.storeSecurityCredentials({ username: user.email!, password });
              await this.databaseSvc.updateDocument(`users/${user.uid}`, {
                biometryActivated: true,
              });
              this.biometryEnabled = true;
              await this.messageSvc.success('Biometría activada');
              return true;
            } catch {
              await this.messageSvc.error('Contraseña incorrecta');
              return false;
            }
          },
        },
      ],
    });
    await alert.present();
  }

  // ===== Navigation =====
  navigateToAddPayment(): void {
    this.router.navigateByUrl('/add-payment-method');
  }

  navigateToTransaction(): void {
    this.router.navigateByUrl('/transaction');
  }

  navigateToHistory(): void {
    this.router.navigateByUrl('/movement-history');
  }

  handleMainAction(key: string): void {
    if (key === 'add') this.navigateToAddPayment();
    else if (key === 'pay') this.navigateToTransaction();
    else if (key === 'history') this.navigateToHistory();
  }

  // ===== Edit Modal =====
  openEditModal(payment: PaymentMethod): void {
    this.editingPayment = payment;
    this.editFormName = payment.cardholderName;
  }

  closeEditModal(): void {
    this.editingPayment = null;
    this.editFormName = '';
  }

  async saveEdit(): Promise<void> {
    if (!this.editingPayment?.id || !this.editFormName.trim()) return;
    try {
      await this.paymentMethodService.updatePaymentMethod(this.editingPayment.id, {
        cardholderName: this.editFormName.trim().toUpperCase(),
      });
      await this.messageSvc.success('Tarjeta actualizada');
      this.closeEditModal();
    } catch {
      await this.messageSvc.error('No se pudo actualizar');
    }
  }

  // ===== Recharge Modal =====
  openAddFundsModal(payment: PaymentMethod): void {
    this.rechargingPayment = payment;
    this.rechargeAmount = 0;
  }

  closeAddFundsModal(): void {
    this.rechargingPayment = null;
    this.rechargeAmount = 0;
  }

  async saveRecharge(): Promise<void> {
    if (!this.rechargingPayment?.id || !this.rechargeAmount || this.rechargeAmount <= 0) return;
    try {
      const newBalance = (this.rechargingPayment.availableBalance || 0) + this.rechargeAmount;
      await this.paymentMethodService.updatePaymentMethod(this.rechargingPayment.id, {
        availableBalance: newBalance,
      });
      await this.messageSvc.success(`Recarga de $${this.rechargeAmount.toLocaleString('es-CO')} exitosa`);
      this.closeAddFundsModal();
    } catch {
      await this.messageSvc.error('No se pudo recargar');
    }
  }

  // ===== Delete =====
  async handleDeletePayment(payment: PaymentMethod): Promise<void> {
    if (!payment.id) return;
    const alert = await this.alertCtrl.create({
      header: 'Eliminar Método de Pago',
      message: `¿Eliminar el método •••• ${payment.cardTail}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.paymentMethodService.deletePaymentMethod(payment.id!);
            await this.messageSvc.success('Método de pago eliminado');
          },
        },
      ],
    });
    await alert.present();
  }

  async handleLogout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/authentication', { replaceUrl: true });
  }

  trackByMethodId(_: number, m: PaymentMethod): string {
    return m.id ?? m.cardTail;
  }
}
