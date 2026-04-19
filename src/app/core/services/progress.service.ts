import { Injectable, inject } from '@angular/core';
import { LoadingController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private loadingCtrl = inject(LoadingController);
  private current: HTMLIonLoadingElement | null = null;

  async display(message = 'Procesando...'): Promise<void> {
    if (this.current) return;
    this.current = await this.loadingCtrl.create({
      message,
      spinner: 'crescent',
      cssClass: 'mdw-loading',
    });
    await this.current.present();
  }

  async dismiss(): Promise<void> {
    if (this.current) {
      await this.current.dismiss();
      this.current = null;
    }
  }

  async executeWithProgress<T>(task: () => Promise<T>, message?: string): Promise<T> {
    await this.display(message);
    try {
      return await task();
    } finally {
      await this.dismiss();
    }
  }
}
