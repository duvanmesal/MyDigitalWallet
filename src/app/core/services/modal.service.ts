import { Injectable, inject, Type } from '@angular/core';
import { ModalController } from '@ionic/angular';

export interface ModalConfig {
  component: Type<any>;
  componentProps?: Record<string, any>;
  cssClass?: string;
  initialBreakpoint?: number;
  breakpoints?: number[];
  showBackdrop?: boolean;
  backdropDismiss?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  private modalCtrl = inject(ModalController);

  /** Abre un modal y devuelve la data cuando se cierra. */
  async open<T = any>(config: ModalConfig): Promise<T | null> {
    const modal = await this.modalCtrl.create({
      component: config.component,
      componentProps: config.componentProps,
      cssClass: config.cssClass ?? 'mdw-modal',
      initialBreakpoint: config.initialBreakpoint,
      breakpoints: config.breakpoints,
      showBackdrop: config.showBackdrop ?? true,
      backdropDismiss: config.backdropDismiss ?? true,
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    return (data as T) ?? null;
  }

  /** Cierra el modal activo y opcionalmente pasa datos de vuelta. */
  async close(data?: any): Promise<void> {
    await this.modalCtrl.dismiss(data);
  }

  /** Cierra todos los modales abiertos. */
  async closeAll(): Promise<void> {
    let top = await this.modalCtrl.getTop();
    while (top) {
      await top.dismiss();
      top = await this.modalCtrl.getTop();
    }
  }
}
