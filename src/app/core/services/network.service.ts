import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface AuthenticationResponse {
  token?: string;
  access_token?: string;
  jwt?: string;
}

export interface PushNotificationRequestPayload {
  token: string;
  notification: { title: string; body: string };
  android: { priority: 'high' | 'normal'; data: Record<string, string> };
}

@Injectable({ providedIn: 'root' })
export class NetworkService {
  private http = inject(HttpClient);
  private authToken: string | null = null;

  private get baseUrl(): string {
    return environment.notificationsBackend.baseUrl;
  }

  private async authenticate(): Promise<string> {
    const { email, password } = environment.notificationsBackend;
    const url = `${this.baseUrl}/user/login`;
    console.log('[Push] authenticate ->', url);
    try {
      const res: any = await firstValueFrom(
        this.http.post<any>(url, { email, password })
      );
      console.log('[Push] authenticate response=' + JSON.stringify(res));
      let token: string | undefined =
        res?.token ??
        res?.access_token ??
        res?.jwt ??
        res?.accessToken ??
        res?.data?.token ??
        res?.data?.access_token ??
        res?.data?.jwt ??
        res?.user?.token;
      if (!token) throw new Error('Authentication failed: no token in response: ' + JSON.stringify(res));
      if (token.toLowerCase().startsWith('bearer ')) {
        token = token.slice(7).trim();
      }
      this.authToken = token;
      return token;
    } catch (e: any) {
      console.error('[Push] authenticate error', e?.status, e?.statusText, e?.error, e?.message);
      throw e;
    }
  }

  private async obtainToken(): Promise<string> {
    return this.authToken ?? (await this.authenticate());
  }

  async transmitNotification(payload: PushNotificationRequestPayload): Promise<void> {
    let token = await this.obtainToken();
    const url = `${this.baseUrl}/notifications`;
    const body = {
      token: payload.token,
      notification: payload.notification,
      android: payload.android,
    };
    const dispatch = (authToken: string) => {
      console.log('[Push] POST', url, JSON.stringify(body));
      return firstValueFrom(
        this.http.post(url, body, {
          headers: new HttpHeaders({ Authorization: `Bearer ${authToken}` }),
        })
      );
    };
    try {
      const r = await dispatch(token);
      console.log('[Push] dispatch OK', r);
    } catch (e: any) {
      console.error('[Push] dispatch err', e?.status, JSON.stringify(e?.error));
      if (e?.status === 401 || e?.status === 403) {
        this.authToken = null;
        token = await this.authenticate();
        const r2 = await dispatch(token);
        console.log('[Push] dispatch OK (retry)', r2);
      } else {
        throw e;
      }
    }
  }
}
