import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { DatabaseService } from './database.service';
import { AuthenticationService } from './authentication.service';
import { ClientAccount } from '../models/account.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private databaseSvc = inject(DatabaseService);
  private auth = inject(AuthenticationService);

  /** Observable del perfil del usuario autenticado. */
  profile$: Observable<ClientAccount | null> = this.auth.user$.pipe(
    switchMap((user) => {
      if (!user) return [null];
      return this.databaseSvc
        .collection$<ClientAccount>('users')
        .pipe(map((users) => users.find((u) => u.uid === user.uid) ?? null));
    })
  );

  /** Obtiene el perfil por UID (una sola vez). */
  async getProfile(uid: string): Promise<ClientAccount | null> {
    return this.databaseSvc.getDocument<ClientAccount>(`users/${uid}`);
  }

  /** Actualiza campos parciales del perfil. */
  async updateProfile(uid: string, data: Partial<ClientAccount>): Promise<void> {
    return this.databaseSvc.updateDocument(`users/${uid}`, data);
  }

  /** Devuelve el saldo total sumando todos los métodos de pago del usuario. */
  async getTotalBalance(uid: string): Promise<number> {
    const methods = await this.databaseSvc.getDocument<{ availableBalance?: number }[]>(
      `users/${uid}/payment-methods`
    );
    if (!Array.isArray(methods)) return 0;
    return methods.reduce((acc, m) => acc + (m.availableBalance ?? 0), 0);
  }

  /** Actualiza la preferencia de biometría. */
  async setBiometryPreference(uid: string, enabled: boolean): Promise<void> {
    return this.databaseSvc.updateDocument(`users/${uid}`, { biometryActivated: enabled });
  }

  /** Guarda el token FCM del dispositivo. */
  async saveDeviceToken(uid: string, token: string): Promise<void> {
    return this.databaseSvc.updateDocument(`users/${uid}`, { deviceToken: token });
  }
}
