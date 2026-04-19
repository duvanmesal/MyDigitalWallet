import { Injectable, inject } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  authState,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { DatabaseService } from './database.service';
import { ClientAccount } from '../models/account.model';

export interface EnrollmentData {
  firstName: string;
  familyName: string;
  documentCategory: ClientAccount['documentCategory'];
  documentId: string;
  country: string;
  emailAddress: string;
  accessPassword: string;
}

const GOOGLE_WEB_CLIENT_ID =
  '42918699567-1niphchki4b4ulpj02f5p3gb4q4jur3j.apps.googleusercontent.com';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private auth = inject(Auth);
  private databaseService = inject(DatabaseService);
  private googleInitialized = false;

  readonly user$: Observable<User | null> = authState(this.auth);

  private async ensureGoogleInitialized(): Promise<void> {
    if (this.googleInitialized) return;
    await GoogleSignIn.initialize({ clientId: GOOGLE_WEB_CLIENT_ID });
    this.googleInitialized = true;
  }

  get authenticatedUser(): User | null {
    return this.auth.currentUser;
  }

  async login(emailAddress: string, accessPassword: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(this.auth, emailAddress, accessPassword);
    return cred.user;
  }

  async register(payload: EnrollmentData): Promise<User> {
    const cred = await createUserWithEmailAndPassword(this.auth, payload.emailAddress, payload.accessPassword);
    const displayName = `${payload.firstName} ${payload.familyName}`.trim();
    await updateProfile(cred.user, { displayName });

    const account: ClientAccount = {
      uid: cred.user.uid,
      firstName: payload.firstName,
      familyName: payload.familyName,
      documentCategory: payload.documentCategory,
      documentId: payload.documentId,
      country: payload.country,
      emailAddress: payload.emailAddress,
      creationTimestamp: Date.now(),
      biometryActivated: false,
    };
    await this.databaseService.setDocument(`users/${cred.user.uid}`, account);
    return cred.user;
  }

  async loginWithGoogle(): Promise<User> {
    await this.ensureGoogleInitialized();
    const result = await GoogleSignIn.signIn();
    const idToken = result.idToken;
    if (!idToken) throw new Error('Google no entregó idToken');
    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(this.auth, credential);

    const profilePath = `users/${cred.user.uid}`;
    const existing = await this.databaseService.getDocument<ClientAccount>(profilePath);
    if (!existing) {
      const [firstName = '', ...rest] = (cred.user.displayName ?? '').split(' ');
      const account: ClientAccount = {
        uid: cred.user.uid,
        firstName: firstName,
        familyName: rest.join(' '),
        documentCategory: 'CC',
        documentId: '',
        country: '',
        emailAddress: cred.user.email ?? '',
        creationTimestamp: Date.now(),
        biometryActivated: false,
      };
      await this.databaseService.setDocument(profilePath, account);
    }
    return cred.user;
  }

  async logout(): Promise<void> {
    try {
      await GoogleSignIn.signOut();
    } catch {
      /* no-op if not signed in with Google */
    }
    await signOut(this.auth);
  }

  getProfile(uid: string): Promise<ClientAccount | null> {
    return this.databaseService.getDocument<ClientAccount>(`users/${uid}`);
  }
}
