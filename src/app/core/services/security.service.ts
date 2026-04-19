import { Injectable } from '@angular/core';
import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

const SERVER = 'digitalwallet.secure.credentials';

export interface StoredSecurityCredential {
  username: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class SecurityService {
  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const res = await NativeBiometric.isAvailable();
      return res.isAvailable && res.biometryType !== BiometryType.NONE;
    } catch {
      return false;
    }
  }

  async verify(reason = 'Verifica tu identidad'): Promise<boolean> {
    if (!this.isNative) return true;
    try {
      await NativeBiometric.verifyIdentity({
        reason,
        title: 'DigitalWallet Security',
        subtitle: reason,
        description: 'Usa tu huella o reconocimiento facial',
      });
      return true;
    } catch {
      return false;
    }
  }

  async storeSecurityCredentials(credential: StoredSecurityCredential): Promise<void> {
    if (!this.isNative) return;
    await NativeBiometric.setCredentials({
      username: credential.username,
      password: credential.password,
      server: SERVER,
    });
  }

  async retrieveSecurityCredentials(): Promise<StoredSecurityCredential | null> {
    if (!this.isNative) return null;
    try {
      const c = await NativeBiometric.getCredentials({ server: SERVER });
      return { username: c.username, password: c.password };
    } catch {
      return null;
    }
  }

  async removeSecurityCredentials(): Promise<void> {
    if (!this.isNative) return;
    try {
      await NativeBiometric.deleteCredentials({ server: SERVER });
    } catch {
      /* no-op */
    }
  }
}
