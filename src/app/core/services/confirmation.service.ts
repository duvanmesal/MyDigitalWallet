import { Injectable, inject } from '@angular/core';
import { AlertController } from '@ionic/angular';

export interface ConfirmationDialogOptions {
  header?: string;
  message: string;
  acceptText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private alertCtrl = inject(AlertController);

  async confirm(opts: ConfirmationDialogOptions): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: opts.header ?? 'Confirmar',
        message: opts.message,
        cssClass: opts.isDestructive ? 'mdw-alert-danger' : 'mdw-alert',
        buttons: [
          {
            text: opts.cancelText ?? 'Cancelar',
            role: 'cancel',
            handler: () => resolve(false),
          },
          {
            text: opts.acceptText ?? 'Aceptar',
            role: 'confirm',
            handler: () => resolve(true),
          },
        ],
      });
      await alert.present();
    });
  }

  async showAlert(message: string, header = 'Aviso'): Promise<void> {
    const a = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
    });
    await a.present();
    await a.onDidDismiss();
  }
}
