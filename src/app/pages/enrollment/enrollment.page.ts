import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../core/services/authentication.service';
import { MessageService } from '../../core/services/message.service';
import { IdentificationType } from '../../core/models/account.model';

@Component({
  selector: 'app-enrollment',
  templateUrl: './enrollment.page.html',
  styleUrls: ['./enrollment.page.scss'],
  standalone: false,
})
export class EnrollmentPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthenticationService);
  private messageSvc = inject(MessageService);
  private router = inject(Router);

  isProcessing = false;

  readonly identificationTypes: { value: IdentificationType; label: string }[] = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'PAS', label: 'Pasaporte' },
  ];

  formData = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    familyName: ['', [Validators.required, Validators.minLength(2)]],
    documentCategory: ['CC' as IdentificationType, [Validators.required]],
    documentId: ['', [Validators.required, Validators.pattern(/^\d{4,15}$/)]],
    country: ['Colombia', [Validators.required]],
    emailAddress: ['', [Validators.required, Validators.email]],
    accessPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  async handleSubmit(): Promise<void> {
    if (this.formData.invalid || this.isProcessing) {
      this.formData.markAllAsTouched();
      return;
    }
    this.isProcessing = true;
    try {
      await this.auth.register(this.formData.getRawValue());
      await this.displayMessage('Cuenta creada exitosamente', 'success');
      await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    } catch (e: unknown) {
      console.error('[Enrollment] error', e);
      await this.displayMessage(this.interpretError(e), 'danger');
    } finally {
      this.isProcessing = false;
    }
  }

  navigateToAuthentication(): void {
    this.router.navigateByUrl('/authentication');
  }

  private interpretError(e: unknown): string {
    const code = (e as { code?: string })?.code ?? '';
    const message = (e as { message?: string })?.message ?? '';
    if (code.includes('email-already-in-use')) return 'El correo ya está registrado';
    if (code.includes('weak-password')) return 'Contraseña débil (mínimo 6 caracteres)';
    if (code.includes('invalid-email')) return 'Correo inválido';
    if (code.includes('permission-denied')) return 'Firestore: permisos denegados (revisa las reglas)';
    if (code.includes('unavailable')) return 'Firestore no disponible (¿base de datos creada?)';
    return message || code || 'No se pudo crear la cuenta';
  }

  private async displayMessage(message: string, type: 'success' | 'danger'): Promise<void> {
    if (type === 'success') {
      await this.messageSvc.success(message);
    } else {
      await this.messageSvc.error(message);
    }
  }
}
