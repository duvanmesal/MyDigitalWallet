import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { SavingsService } from '../../core/services/savings.service';
import { MessageService } from '../../core/services/message.service';
import { ProgressService } from '../../core/services/progress.service';
import {
  CreateSavingsPlanInput,
  SavingsDraftTarget,
  SavingsFrequency,
  SavingsImportPreview,
  SavingsPlan,
  SavingsPlanCreationType,
  SavingsPlanGenerationConfig,
} from '../../core/models/savings.model';

@Component({
  selector: 'app-savings',
  templateUrl: './savings.page.html',
  styleUrls: ['./savings.page.scss'],
  standalone: false,
})
export class SavingsPage {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private savingsService = inject(SavingsService);
  private messageSvc = inject(MessageService);
  private progressSvc = inject(ProgressService);

  readonly savingsPlans$ = this.savingsService.savingsPlans$();
  readonly plansSummary$ = this.savingsPlans$.pipe(
    map((plans) => ({
      totalPlans: plans.length,
      totalGoal: plans.reduce((sum, plan) => sum + plan.totalGoal, 0),
      totalSaved: plans.reduce((sum, plan) => sum + plan.totalSaved, 0),
      activePlans: plans.filter((plan) => plan.status === 'active').length,
    }))
  );

  readonly frequencyOptions: Array<{ value: SavingsFrequency; label: string }> = [
    { value: 'daily', label: 'Diaria' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'biweekly', label: 'Quincenal' },
    { value: 'monthly', label: 'Mensual' },
  ];

  isCreateSheetOpen = false;
  creationMode: SavingsPlanCreationType = 'rule_based';
  importPreview: SavingsImportPreview | null = null;
  importFileName = '';

  readonly ruleForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    initialAmount: [1000, [Validators.required, Validators.min(100)]],
    incrementAmount: [1000, [Validators.required, Validators.min(0)]],
    periodsCount: [10, [Validators.required, Validators.min(1), Validators.max(200)]],
    frequency: ['weekly' as SavingsFrequency, Validators.required],
  });

  readonly manualForm = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    description: this.fb.nonNullable.control(''),
    targets: this.fb.array([]),
  });

  readonly importForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
  });

  constructor() {
    this.addManualTarget();
    this.addManualTarget();
    this.addManualTarget();
  }

  get manualTargets(): FormArray {
    return this.manualForm.get('targets') as FormArray;
  }

  get rulePreviewTargets(): SavingsDraftTarget[] {
    if (this.ruleForm.invalid) return [];
    const raw = this.ruleForm.getRawValue();
    const config: SavingsPlanGenerationConfig = {
      initialAmount: this.toCurrencyValue(raw.initialAmount),
      incrementAmount: this.toCurrencyValue(raw.incrementAmount),
      periodsCount: Number(raw.periodsCount),
      frequency: raw.frequency,
      generationMode: 'incremental_fixed',
      currency: 'COP',
    };
    return this.savingsService.generateRuleBasedTargets({
      ...config,
    });
  }

  get rulePreviewTotal(): number {
    return this.rulePreviewTargets.reduce((sum, item) => sum + item.targetAmount, 0);
  }

  get manualPreviewTargets(): SavingsDraftTarget[] {
    return this.manualTargets.controls
      .map((control, index) => {
        const label = String(control.get('label')?.value ?? '').trim() || `Submonto ${index + 1}`;
        const amount = this.toCurrencyValue(control.get('targetAmount')?.value);
        return {
          label,
          targetAmount: amount,
          origin: 'manual' as const,
          displayOrder: index,
        };
      })
      .filter((target) => target.targetAmount > 0);
  }

  get manualPreviewTotal(): number {
    return this.manualPreviewTargets.reduce((sum, item) => sum + item.targetAmount, 0);
  }

  openCreateSheet(mode: SavingsPlanCreationType = 'rule_based'): void {
    this.creationMode = mode;
    this.isCreateSheetOpen = true;
  }

  closeCreateSheet(): void {
    this.isCreateSheetOpen = false;
    this.resetImportedPreview();
  }

  goBack(): void {
    this.router.navigateByUrl('/dashboard');
  }

  navigateToPlan(planId?: string): void {
    if (!planId) return;
    this.router.navigate(['/savings', planId]);
  }

  setCreationMode(mode: SavingsPlanCreationType): void {
    this.creationMode = mode;
  }

  addManualTarget(): void {
    this.manualTargets.push(
      this.fb.group({
        label: this.fb.nonNullable.control(''),
        targetAmount: this.fb.nonNullable.control(0, [Validators.required, Validators.min(100)]),
      })
    );
  }

  removeManualTarget(index: number): void {
    if (this.manualTargets.length <= 1) return;
    this.manualTargets.removeAt(index);
  }

  moveManualTarget(index: number, direction: -1 | 1): void {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= this.manualTargets.length) return;
    const current = this.manualTargets.at(index);
    this.manualTargets.removeAt(index);
    this.manualTargets.insert(targetIndex, current);
  }

  async handleImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importFileName = file.name;

    try {
      const content = await file.text();
      this.importPreview = this.savingsService.parseImportedTargets(content);
      if (!this.importPreview.items.length) {
        await this.messageSvc.warning('No se encontraron submontos válidos en el archivo');
      }
    } catch {
      this.importPreview = null;
      await this.messageSvc.error('No se pudo leer el archivo importado');
    } finally {
      input.value = '';
    }
  }

  async createPlan(): Promise<void> {
    try {
      const payload = this.buildCreatePayload();
      const planId = await this.progressSvc.executeWithProgress(
        () => this.savingsService.createSavingsPlan(payload),
        'Creando plan de ahorro...'
      );
      await this.messageSvc.success('Plan de ahorro creado');
      this.resetCreateForms();
      this.isCreateSheetOpen = false;
      await this.router.navigate(['/savings', planId]);
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message ?? 'No se pudo crear el plan';
      await this.messageSvc.error(message);
    }
  }

  creationTypeLabel(type: SavingsPlan['creationType']): string {
    if (type === 'rule_based') return 'Por regla';
    if (type === 'manual') return 'Manual';
    return 'Importado';
  }

  trackByPlanId(_: number, plan: SavingsPlan): string {
    return plan.id ?? plan.name;
  }

  trackByTargetIndex(index: number): number {
    return index;
  }

  private buildCreatePayload(): CreateSavingsPlanInput {
    if (this.creationMode === 'rule_based') {
      if (this.ruleForm.invalid) {
        this.ruleForm.markAllAsTouched();
        throw new Error('Completa los datos del plan automático');
      }

      const raw = this.ruleForm.getRawValue();
      const generationConfig: SavingsPlanGenerationConfig = {
        initialAmount: this.toCurrencyValue(raw.initialAmount),
        incrementAmount: this.toCurrencyValue(raw.incrementAmount),
        periodsCount: Number(raw.periodsCount),
        frequency: raw.frequency,
        generationMode: 'incremental_fixed',
        currency: 'COP',
      };

      return {
        name: raw.name.trim(),
        description: raw.description.trim(),
        creationType: 'rule_based',
        generationConfig,
        currency: 'COP',
        targets: this.rulePreviewTargets,
      };
    }

    if (this.creationMode === 'manual') {
      if (this.manualForm.invalid || !this.manualPreviewTargets.length) {
        this.manualForm.markAllAsTouched();
        throw new Error('Agrega al menos un submonto manual válido');
      }

      return {
        name: this.manualForm.getRawValue().name.trim(),
        description: this.manualForm.getRawValue().description.trim(),
        creationType: 'manual',
        generationConfig: null,
        currency: 'COP',
        targets: this.manualPreviewTargets,
      };
    }

    if (this.importForm.invalid) {
      this.importForm.markAllAsTouched();
      throw new Error('Completa el nombre del plan importado');
    }

    if (!this.importPreview?.items.length) {
      throw new Error('Importa un archivo compatible antes de guardar');
    }

    if (this.importPreview.errors.length) {
      throw new Error('Corrige las filas inválidas del archivo antes de confirmar');
    }

    return {
      name: this.importForm.getRawValue().name.trim(),
      description: this.importForm.getRawValue().description.trim(),
      creationType: 'imported',
      generationConfig: null,
      currency: 'COP',
      targets: this.importPreview.items,
    };
  }

  private resetCreateForms(): void {
    this.ruleForm.reset({
      name: '',
      description: '',
      initialAmount: 1000,
      incrementAmount: 1000,
      periodsCount: 10,
      frequency: 'weekly',
    });

    this.manualForm.reset({ name: '', description: '' });
    while (this.manualTargets.length) {
      this.manualTargets.removeAt(0);
    }
    this.addManualTarget();
    this.addManualTarget();
    this.addManualTarget();

    this.importForm.reset({ name: '', description: '' });
    this.resetImportedPreview();
  }

  private resetImportedPreview(): void {
    this.importPreview = null;
    this.importFileName = '';
  }

  private toCurrencyValue(value: unknown): number {
    const normalized = String(value ?? '').replace(/[^\d-]/g, '');
    const amount = Number.parseInt(normalized, 10);
    return Number.isFinite(amount) ? Math.max(0, amount) : 0;
  }
}
