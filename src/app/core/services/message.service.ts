import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';

export type MessageType = 'success' | 'danger' | 'warning' | 'primary';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private toastCtrl = inject(ToastController);

  async display(message: string, messageType: MessageType = 'primary', duration = 2200): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color: messageType,
      position: 'top',
      buttons: [{ text: '✕', role: 'cancel' }],
    });
    await toast.present();
  }

  success(message: string) {
    return this.display(message, 'success');
  }

  error(message: string) {
    return this.display(message, 'danger', 3000);
  }

  warning(message: string) {
    return this.display(message, 'warning');
  }
}
