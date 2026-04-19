import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AuthenticationService } from './authentication.service';
import { DatabaseService } from './database.service';
import { NetworkService } from './network.service';
import { MessageService } from './message.service';
import { ConfirmationService } from './confirmation.service';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private auth = inject(AuthenticationService);
  private databaseSvc = inject(DatabaseService);
  private networkSvc = inject(NetworkService);
  private messageSvc = inject(MessageService);
  private confirmationSvc = inject(ConfirmationService);
  private pushToken: string | null = null;
  private hasRegistered = false;

  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  async initializePushNotifications(): Promise<void> {
    if (!this.isNative || this.hasRegistered) return;
    this.hasRegistered = true;

    const perm = await PushNotifications.checkPermissions();
    let status = perm.receive;
    if (status === 'prompt' || status === 'prompt-with-rationale') {
      status = (await PushNotifications.requestPermissions()).receive;
    }
    if (status !== 'granted') {
      console.warn('[Push] permiso no concedido');
      return;
    }

    PushNotifications.addListener('registration', async (token: Token) => {
      this.pushToken = token.value;
      const user = this.auth.authenticatedUser;
      if (user) {
        await this.databaseSvc.updateDocument(`users/${user.uid}`, {
          deviceToken: token.value,
        });
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] registration error', err);
    });

    PushNotifications.addListener(
      'pushNotificationReceived',
      async (notification: PushNotificationSchema) => {
        const title = notification.title ?? 'Notificación';
        const body = notification.body ?? '';
        this.messageSvc.display(`${title}: ${body}`, 'success', 3500).catch(() => {});
        try {
          const perm = await LocalNotifications.checkPermissions();
          console.log('[Push] local perm', perm);
          const res = await LocalNotifications.schedule({
            notifications: [
              {
                id: Math.floor(Math.random() * 100000),
                title,
                body,
                channelId: 'default',
              },
            ],
          });
          console.log('[Push] local notif scheduled', res);
        } catch (e) {
          console.error('[Push] local notif error', e);
        }
      }
    );

    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      async (action: ActionPerformed) => {
        const n = action.notification;
        await this.confirmationSvc.showAlert(n.body ?? '', n.title ?? 'Notificación');
      }
    );

    try {
      const localPerm = await LocalNotifications.checkPermissions();
      if (localPerm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
      await LocalNotifications.createChannel({
        id: 'default',
        name: 'Transacciones',
        description: 'Notificaciones de transacciones',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
      });
    } catch (e) {
      console.warn('[Push] LocalNotifications setup failed', e);
    }

    await PushNotifications.register();
  }

  async sendTransactionSuccessAlert(vendor: string, transactionAmount: number): Promise<void> {
    const user = this.auth.authenticatedUser;
    if (!user) return;
    const profile = await this.databaseSvc.getDocument<{ deviceToken?: string }>(
      `users/${user.uid}`
    );
    const token = profile?.deviceToken ?? this.pushToken;
    if (!token) {
      console.warn('[Push] sin token de dispositivo, no se envía alerta');
      return;
    }
    const title = 'Transacción completada';
    const body = `Has realizado una transacción de $${transactionAmount.toLocaleString('es-CO')} a ${vendor}`;
    await this.networkSvc.transmitNotification({
      token,
      notification: { title, body },
      android: {
        priority: 'high',
        data: { title, body, type: 'transaction', userId: user.uid },
      },
    });
  }
}
