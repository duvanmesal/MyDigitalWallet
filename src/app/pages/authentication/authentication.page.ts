import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../core/services/authentication.service';
import { SecurityService } from '../../core/services/security.service';
import { MessageService } from '../../core/services/message.service';

@Component({
  selector: 'app-authentication',
  templateUrl: './authentication.page.html',
  styleUrls: ['./authentication.page.scss'],
  standalone: false,
})
export class AuthenticationPage implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthenticationService);
  private security = inject(SecurityService);
  private messageSvc = inject(MessageService);
  private router = inject(Router);

  isProcessing = false;
  biometryAvailable = false;

  formData = this.fb.nonNullable.group({
    emailAddress: ['', [Validators.required, Validators.email]],
    accessPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  async ngOnInit(): Promise<void> {
    if (!(await this.security.isAvailable())) return;
    const creds = await this.security.retrieveSecurityCredentials();
    this.biometryAvailable = !!creds;
  }

  async handleGoogleSignIn(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      await this.auth.loginWithGoogle();
      await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    } catch (e: unknown) {
      await this.displayError('No se pudo iniciar sesión con Google');
    } finally {
      this.isProcessing = false;
    }
  }

  async handleBiometricSignIn(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      const verified = await this.security.verify('Verifica tu identidad con biometría');
      if (!verified) return;
      const creds = await this.security.retrieveSecurityCredentials();
      if (!creds) {
        await this.displayError('Sin credenciales guardadas');
        return;
      }
      await this.auth.login(creds.username, creds.password);
      await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    } catch (e: unknown) {
      await this.displayError(this.interpretError(e));
    } finally {
      this.isProcessing = false;
    }
  }

  async handleSubmit(): Promise<void> {
    if (this.formData.invalid || this.isProcessing) {
      this.formData.markAllAsTouched();
      return;
    }
    this.isProcessing = true;
    try {
      const { emailAddress, accessPassword } = this.formData.getRawValue();
      await this.auth.login(emailAddress, accessPassword);
      await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    } catch (e: unknown) {
      await this.displayError(this.interpretError(e));
    } finally {
      this.isProcessing = false;
    }
  }

  navigateToEnrollment(): void {
    this.router.navigateByUrl('/enrollment');
  }

  private interpretError(e: unknown): string {
    const code = (e as { code?: string })?.code ?? '';
    if (code.includes('invalid-credential') || code.includes('wrong-password')) {
      return 'Credenciales incorrectas';
    }
    if (code.includes('user-not-found')) return 'Usuario no encontrado';
    return 'No se pudo iniciar sesión';
  }

  private async displayError(message: string): Promise<void> {
    await this.messageSvc.error(message);
  }
}
