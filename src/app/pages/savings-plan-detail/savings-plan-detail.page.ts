import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { MessageService } from '../../core/services/message.service';
import { ProgressService } from '../../core/services/progress.service';
import { SavingsService } from '../../core/services/savings.service';
import {
  RegisterSavingsContributionInput,
  SavingsContribution,
  SavingsPlan,
  SavingsTarget,
  calculateSavingsProgress,
} from '../../core/models/savings.model';

interface SavingsTargetCard extends SavingsTarget {
  progressPercent: number;
  history: SavingsContribution[];
}

interface PendingAllocation {
  targetId: string;
  targetLabel: string;
  amount: number;
  sourceKind: 'direct' | 'overflow';
}

interface PendingContributionDraft {
  totalInputAmount: number;
  contributionDate: number;
  note: string;
  pendingOverflow: number;
  allocations: PendingAllocation[];
}

@Component({
  selector: 'app-savings-plan-detail',
  templateUrl: './savings-plan-detail.page.html',
  styleUrls: ['./savings-plan-detail.page.scss'],
  standalone: false,
})
export class SavingsPlanDetailPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageSvc = inject(MessageService);
  private progressSvc = inject(ProgressService);
  private savingsService = inject(SavingsService);
  private subscriptions = new Subscription();

  planId = '';
  plan: SavingsPlan | null = null;
  targets: SavingsTarget[] = [];

  isContributionSheetOpen = false;
  isOverflowSheetOpen = false;
  expandedTargetId = '';

  contributionDraft: PendingContributionDraft | null = null;

  readonly contributionForm = this.fb.nonNullable.group({
    targetId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(100)]],
    contributionDate: [this.getTodayIso(), Validators.required],
    note: [''],
  });

  readonly historyFilterTargetId$ = new BehaviorSubject<string>('');

  plan$!: Observable<SavingsPlan | null>;
  targetCards$!: Observable<SavingsTargetCard[]>;
  filteredHistory$!: Observable<SavingsContribution[]>;

  ngOnInit(): void {
    this.planId = this.route.snapshot.paramMap.get('planId') ?? '';
    if (!this.planId) {
      this.router.navigateByUrl('/savings');
      return;
    }

    this.plan$ = this.savingsService.savingsPlan$(this.planId);
    const targets$ = this.savingsService.savingsTargets$(this.planId);
    const contributions$ = this.savingsService.savingsContributions$(this.planId);

    this.targetCards$ = combineLatest([targets$, contributions$]).pipe(
      map(([targets, contributions]) =>
        targets.map((target) => ({
          ...target,
          progressPercent: calculateSavingsProgress(target.savedAmount, target.targetAmount),
          history: contributions.filter((entry) => entry.targetId === target.id),
        }))
      )
    );

    this.filteredHistory$ = combineLatest([contributions$, this.historyFilterTargetId$]).pipe(
      map(([contributions, targetId]) =>
        targetId ? contributions.filter((entry) => entry.targetId === targetId) : contributions
      )
    );

    this.subscriptions.add(
      this.plan$.subscribe((plan) => {
        this.plan = plan;
        if (!plan) {
          this.router.navigateByUrl('/savings');
        }
      })
    );

    this.subscriptions.add(
      targets$.subscribe((targets) => {
        this.targets = targets;
        this.ensureDefaultTarget();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  goBack(): void {
    this.router.navigateByUrl('/savings');
  }

  openContributionSheet(target?: SavingsTarget): void {
    const destination = target ?? this.targets.find((item) => item.remainingAmount > 0);
    if (!destination) {
      this.messageSvc.warning('No hay submontos disponibles para recibir abonos');
      return;
    }

    this.contributionForm.patchValue({
      targetId: destination.id ?? '',
      amount: 0,
      contributionDate: this.getTodayIso(),
      note: '',
    });
    this.contributionDraft = null;
    this.isOverflowSheetOpen = false;
    this.isContributionSheetOpen = true;
  }

  closeContributionSheet(): void {
    this.isContributionSheetOpen = false;
  }

  cancelOverflowFlow(): void {
    this.contributionDraft = null;
    this.isOverflowSheetOpen = false;
    this.isContributionSheetOpen = true;
  }

  async prepareContribution(): Promise<void> {
    if (this.contributionForm.invalid || !this.plan) {
      this.contributionForm.markAllAsTouched();
      return;
    }

    const raw = this.contributionForm.getRawValue();
    const totalInputAmount = this.toCurrencyValue(raw.amount);
    const target = this.targets.find((item) => item.id === raw.targetId);

    if (!target) {
      await this.messageSvc.error('Selecciona un submonto válido');
      return;
    }

    if (target.remainingAmount <= 0) {
      await this.messageSvc.error('Ese submonto ya está completado');
      return;
    }

    if (totalInputAmount <= 0) {
      await this.messageSvc.error('Ingresa un monto válido');
      return;
    }

    const remainingPlanAmount = Math.max(0, this.plan.totalGoal - this.plan.totalSaved);
    if (totalInputAmount > remainingPlanAmount) {
      await this.messageSvc.error('El abono supera el saldo pendiente del plan');
      return;
    }

    const appliedAmount = Math.min(totalInputAmount, target.remainingAmount);
    const overflowAmount = totalInputAmount - appliedAmount;

    this.contributionDraft = {
      totalInputAmount,
      contributionDate: this.isoToTimestamp(raw.contributionDate),
      note: raw.note.trim(),
      pendingOverflow: overflowAmount,
      allocations: [
        {
          targetId: target.id ?? '',
          targetLabel: target.label,
          amount: appliedAmount,
          sourceKind: 'direct',
        },
      ],
    };

    if (overflowAmount > 0) {
      this.isContributionSheetOpen = false;
      this.isOverflowSheetOpen = true;
      return;
    }

    await this.finalizeContribution();
  }

  async assignOverflow(targetId: string): Promise<void> {
    if (!this.contributionDraft) return;

    const target = this.targets.find((item) => item.id === targetId);
    if (!target) {
      await this.messageSvc.error('El submonto seleccionado ya no está disponible');
      return;
    }

    const availableAmount = this.getTargetRemainingAfterDraft(targetId);
    if (availableAmount <= 0) {
      await this.messageSvc.warning('Ese submonto ya no tiene saldo pendiente');
      return;
    }

    const appliedAmount = Math.min(this.contributionDraft.pendingOverflow, availableAmount);
    this.contributionDraft = {
      ...this.contributionDraft,
      pendingOverflow: this.contributionDraft.pendingOverflow - appliedAmount,
      allocations: [
        ...this.contributionDraft.allocations,
        {
          targetId,
          targetLabel: target.label,
          amount: appliedAmount,
          sourceKind: 'overflow',
        },
      ],
    };
  }

  async finalizeContribution(): Promise<void> {
    if (!this.contributionDraft) return;
    if (this.contributionDraft.pendingOverflow > 0) {
      await this.messageSvc.warning('Asigna todo el excedente antes de guardar');
      return;
    }

    const payload: RegisterSavingsContributionInput = {
      planId: this.planId,
      totalInputAmount: this.contributionDraft.totalInputAmount,
      contributionDate: this.contributionDraft.contributionDate,
      note: this.contributionDraft.note,
      allocations: this.contributionDraft.allocations.map((allocation) => ({
        targetId: allocation.targetId,
        amount: allocation.amount,
        sourceKind: allocation.sourceKind,
      })),
    };

    try {
      await this.progressSvc.executeWithProgress(
        () => this.savingsService.registerContribution(payload),
        'Registrando abono...'
      );
      await this.messageSvc.success('Abono registrado correctamente');
      this.resetContributionState();
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message ?? 'No se pudo registrar el abono';
      await this.messageSvc.error(message);
    }
  }

  setHistoryFilter(targetId: string): void {
    this.historyFilterTargetId$.next(targetId);
  }

  toggleTargetHistory(targetId?: string): void {
    if (!targetId) return;
    this.expandedTargetId = this.expandedTargetId === targetId ? '' : targetId;
  }

  trackByTargetId(_: number, target: SavingsTargetCard): string {
    return target.id ?? target.label;
  }

  trackByContributionId(_: number, contribution: SavingsContribution): string {
    return contribution.id ?? `${contribution.targetId}_${contribution.entryDate}_${contribution.amount}`;
  }

  statusLabel(status: SavingsTarget['status']): string {
    if (status === 'pending') return 'Pendiente';
    if (status === 'in_progress') return 'En progreso';
    return 'Completado';
  }

  hasOverflowTargetsAvailable(): boolean {
    return this.targets.some((target) => this.getTargetRemainingAfterDraft(target.id ?? '') > 0);
  }

  getTargetRemainingAfterDraft(targetId: string): number {
    const target = this.targets.find((item) => item.id === targetId);
    if (!target) return 0;
    const alreadyAllocated = this.contributionDraft?.allocations
      .filter((allocation) => allocation.targetId === targetId)
      .reduce((sum, allocation) => sum + allocation.amount, 0) ?? 0;
    return Math.max(0, target.remainingAmount - alreadyAllocated);
  }

  private ensureDefaultTarget(): void {
    const selectedTargetId = this.contributionForm.controls.targetId.value;
    const stillExists = this.targets.some((target) => target.id === selectedTargetId && target.remainingAmount > 0);
    if (stillExists) return;

    const fallback = this.targets.find((target) => target.remainingAmount > 0);
    if (fallback?.id) {
      this.contributionForm.patchValue({ targetId: fallback.id });
    }
  }

  private resetContributionState(): void {
    this.contributionDraft = null;
    this.isContributionSheetOpen = false;
    this.isOverflowSheetOpen = false;
    this.contributionForm.reset({
      targetId: this.targets.find((target) => target.remainingAmount > 0)?.id ?? '',
      amount: 0,
      contributionDate: this.getTodayIso(),
      note: '',
    });
  }

  private getTodayIso(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isoToTimestamp(value: string): number {
    const [year, month, day] = value.split('-').map((item) => Number(item));
    return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
  }

  private toCurrencyValue(value: unknown): number {
    const normalized = String(value ?? '').replace(/[^\d-]/g, '');
    const amount = Number.parseInt(normalized, 10);
    return Number.isFinite(amount) ? Math.max(0, amount) : 0;
  }
}
