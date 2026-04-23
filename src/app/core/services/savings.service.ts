import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  orderBy,
  query,
  runTransaction,
} from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import { AuthenticationService } from './authentication.service';
import {
  CreateSavingsPlanInput,
  RegisterSavingsContributionInput,
  SavingsContribution,
  SavingsDraftTarget,
  SavingsImportPreview,
  SavingsPlan,
  SavingsPlanGenerationConfig,
  SavingsTarget,
  calculateSavingsProgress,
  getSavingsTargetStatus,
} from '../models/savings.model';

const IMPORT_HEADERS = {
  amount: ['amount', 'monto', 'targetamount', 'goal', 'valor', 'submonto'],
  label: ['label', 'nombre', 'name', 'descripcion', 'description', 'meta'],
};

@Injectable({ providedIn: 'root' })
export class SavingsService {
  private firestore = inject(Firestore);
  private auth = inject(AuthenticationService);
  private injector = inject(Injector);

  savingsPlans$(): Observable<SavingsPlan[]> {
    return this.auth.user$.pipe(
      switchMap((user) => {
        if (!user) return of([] as SavingsPlan[]);
        return runInInjectionContext(this.injector, () => {
          const ref = collection(this.firestore, `users/${user.uid}/savings-plans`);
          return collectionData(query(ref, orderBy('updatedAt', 'desc')), { idField: 'id' }) as Observable<SavingsPlan[]>;
        });
      })
    );
  }

  savingsPlan$(planId: string): Observable<SavingsPlan | null> {
    return this.auth.user$.pipe(
      switchMap((user) => {
        if (!user || !planId) return of(null);
        return runInInjectionContext(this.injector, () => {
          const ref = doc(this.firestore, `users/${user.uid}/savings-plans/${planId}`);
          return docData(ref, { idField: 'id' }) as Observable<SavingsPlan | null>;
        });
      })
    );
  }

  savingsTargets$(planId: string): Observable<SavingsTarget[]> {
    return this.auth.user$.pipe(
      switchMap((user) => {
        if (!user || !planId) return of([] as SavingsTarget[]);
        return runInInjectionContext(this.injector, () => {
          const ref = collection(this.firestore, `users/${user.uid}/savings-plans/${planId}/targets`);
          return collectionData(query(ref, orderBy('displayOrder', 'asc')), { idField: 'id' }) as Observable<SavingsTarget[]>;
        });
      })
    );
  }

  savingsContributions$(planId: string): Observable<SavingsContribution[]> {
    return this.auth.user$.pipe(
      switchMap((user) => {
        if (!user || !planId) return of([] as SavingsContribution[]);
        return runInInjectionContext(this.injector, () => {
          const ref = collection(this.firestore, `users/${user.uid}/savings-plans/${planId}/contributions`);
          return collectionData(query(ref, orderBy('entryDate', 'desc')), { idField: 'id' }) as Observable<SavingsContribution[]>;
        });
      })
    );
  }

  generateRuleBasedTargets(config: SavingsPlanGenerationConfig): SavingsDraftTarget[] {
    return Array.from({ length: config.periodsCount }, (_, index) => {
      const amount = config.initialAmount + (config.incrementAmount * index);
      return {
        label: `${this.resolveFrequencyLabel(config.frequency)} ${index + 1}`,
        targetAmount: amount,
        origin: 'generated',
        displayOrder: index,
      };
    });
  }

  parseImportedTargets(rawContent: string): SavingsImportPreview {
    const normalized = rawContent.replace(/^\uFEFF/, '').replace(/\r/g, '');
    const rows = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!rows.length) {
      return { items: [], errors: ['El archivo no contiene filas válidas.'], delimiter: ',', detectedColumns: [] };
    }

    const delimiter = this.detectDelimiter(rows[0]);
    const firstRow = rows[0].split(delimiter).map((value) => value.trim());
    const normalizedHeaders = firstRow.map((value) => this.normalizeHeader(value));
    const amountColumnIndex = normalizedHeaders.findIndex((header) => IMPORT_HEADERS.amount.includes(header));
    const labelColumnIndex = normalizedHeaders.findIndex((header) => IMPORT_HEADERS.label.includes(header));
    const firstRowLooksLikeData = this.parseCurrencyValue(firstRow[0]) > 0;

    const dataRows = amountColumnIndex >= 0 || labelColumnIndex >= 0 || !firstRowLooksLikeData ? rows.slice(1) : rows;
    const errors: string[] = [];
    const items: SavingsDraftTarget[] = [];

    if (!dataRows.length) {
      return {
        items: [],
        errors: ['No se encontraron filas para importar.'],
        delimiter,
        detectedColumns: normalizedHeaders,
      };
    }

    dataRows.forEach((row, index) => {
      const cells = row.split(delimiter).map((value) => value.trim());
      const amountCandidate = amountColumnIndex >= 0 ? cells[amountColumnIndex] : cells[0];
      const labelCandidate = labelColumnIndex >= 0 ? cells[labelColumnIndex] : cells[1];
      const amount = this.parseCurrencyValue(amountCandidate);

      if (!amount || amount <= 0) {
        errors.push(`Fila ${index + 1}: el monto no es válido.`);
        return;
      }

      items.push({
        label: labelCandidate || `Submonto ${index + 1}`,
        targetAmount: amount,
        origin: 'imported',
        displayOrder: index,
      });
    });

    return {
      items,
      errors,
      delimiter,
      detectedColumns: amountColumnIndex >= 0 || labelColumnIndex >= 0 ? normalizedHeaders : ['amount', 'label'],
    };
  }

  async createSavingsPlan(input: CreateSavingsPlanInput): Promise<string> {
    const user = this.auth.authenticatedUser;
    if (!user) throw new Error('No authenticated user');

    const sanitizedTargets = input.targets
      .map((target, index) => ({
        ...target,
        label: target.label.trim() || `Submonto ${index + 1}`,
        targetAmount: this.parseCurrencyValue(target.targetAmount),
        displayOrder: index,
      }))
      .filter((target) => target.targetAmount > 0);

    if (!input.name.trim()) throw new Error('El plan debe tener un nombre');
    if (!sanitizedTargets.length) throw new Error('Agrega al menos un submonto válido');

    const now = Date.now();
    const planRef = doc(collection(this.firestore, `users/${user.uid}/savings-plans`));
    const totalGoal = sanitizedTargets.reduce((sum, target) => sum + target.targetAmount, 0);

    const planPayload: SavingsPlan = {
      name: input.name.trim(),
      description: input.description?.trim() || '',
      creationType: input.creationType,
      generationConfig: input.generationConfig ?? null,
      totalGoal,
      totalSaved: 0,
      progressPercent: 0,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      currency: input.currency ?? 'COP',
      itemsCount: sanitizedTargets.length,
      completedItemsCount: 0,
    };

    await runTransaction(this.firestore, async (transaction) => {
      transaction.set(planRef, planPayload);

      sanitizedTargets.forEach((target) => {
        const targetRef = doc(collection(this.firestore, `users/${user.uid}/savings-plans/${planRef.id}/targets`));
        const targetPayload: SavingsTarget = {
          planId: planRef.id,
          label: target.label,
          targetAmount: target.targetAmount,
          savedAmount: 0,
          remainingAmount: target.targetAmount,
          status: 'pending',
          startedAt: null,
          completedAt: null,
          displayOrder: target.displayOrder,
          origin: target.origin,
          createdAt: now,
          updatedAt: now,
        };
        transaction.set(targetRef, targetPayload);
      });
    });

    return planRef.id;
  }

  async registerContribution(input: RegisterSavingsContributionInput): Promise<void> {
    const user = this.auth.authenticatedUser;
    if (!user) throw new Error('No authenticated user');
    if (!input.planId) throw new Error('Plan inválido');

    const sanitizedAllocations = input.allocations
      .map((allocation) => ({
        ...allocation,
        amount: this.parseCurrencyValue(allocation.amount),
      }))
      .filter((allocation) => allocation.amount > 0);

    if (!sanitizedAllocations.length) throw new Error('No hay asignaciones válidas');

    const totalAllocated = sanitizedAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    if (totalAllocated !== this.parseCurrencyValue(input.totalInputAmount)) {
      throw new Error('La distribución del abono no coincide con el valor ingresado');
    }

    const planRef = doc(this.firestore, `users/${user.uid}/savings-plans/${input.planId}`);
    const allocationGroupId = this.createAllocationGroupId();
    const contributionDate = input.contributionDate || Date.now();
    const note = input.note?.trim() || '';
    const now = Date.now();

    await runTransaction(this.firestore, async (transaction) => {
      const planSnap = await transaction.get(planRef);
      if (!planSnap.exists()) throw new Error('Plan de ahorro no encontrado');

      const plan = planSnap.data() as SavingsPlan;
      const remainingPlanAmount = Math.max(0, plan.totalGoal - plan.totalSaved);
      if (totalAllocated > remainingPlanAmount) {
        throw new Error('El abono supera el monto pendiente del plan');
      }

      const allocationTargets = new Map<string, SavingsTarget>();
      const allocationRefs = new Map<string, ReturnType<typeof doc>>();

      for (const allocation of sanitizedAllocations) {
        if (!allocationTargets.has(allocation.targetId)) {
          const targetRef = doc(this.firestore, `users/${user.uid}/savings-plans/${input.planId}/targets/${allocation.targetId}`);
          const targetSnap = await transaction.get(targetRef);
          if (!targetSnap.exists()) throw new Error('Uno de los submontos ya no existe');
          allocationRefs.set(allocation.targetId, targetRef);
          allocationTargets.set(allocation.targetId, {
            ...(targetSnap.data() as SavingsTarget),
            id: allocation.targetId,
          });
        }
      }

      let addedAmount = 0;
      let newlyCompletedTargets = 0;

      sanitizedAllocations.forEach((allocation, index) => {
        const target = allocationTargets.get(allocation.targetId);
        const targetRef = allocationRefs.get(allocation.targetId);
        if (!target || !targetRef) throw new Error('No se pudo resolver el submonto');

        const availableAmount = Math.max(0, target.targetAmount - target.savedAmount);
        if (allocation.amount > availableAmount) {
          throw new Error(`El submonto "${target.label}" cambió. Revisa el plan antes de continuar`);
        }

        const updatedSavedAmount = target.savedAmount + allocation.amount;
        const updatedStatus = getSavingsTargetStatus(updatedSavedAmount, target.targetAmount);
        const startedAt = target.startedAt ?? contributionDate;
        const completedAt = updatedStatus === 'completed' ? contributionDate : target.completedAt;

        if (target.status !== 'completed' && updatedStatus === 'completed') {
          newlyCompletedTargets += 1;
        }

        const updatedTarget: Partial<SavingsTarget> = {
          savedAmount: updatedSavedAmount,
          remainingAmount: Math.max(0, target.targetAmount - updatedSavedAmount),
          status: updatedStatus,
          startedAt,
          completedAt,
          updatedAt: now,
        };

        transaction.update(targetRef, updatedTarget);
        allocationTargets.set(allocation.targetId, { ...target, ...updatedTarget });
        addedAmount += allocation.amount;

        const contributionRef = doc(collection(this.firestore, `users/${user.uid}/savings-plans/${input.planId}/contributions`));
        const contributionPayload: SavingsContribution = {
          planId: input.planId,
          targetId: allocation.targetId,
          targetLabel: target.label,
          amount: allocation.amount,
          entryDate: contributionDate,
          note,
          createdAt: now,
          allocationGroupId,
          allocationStep: index,
          sourceKind: allocation.sourceKind,
        };
        transaction.set(contributionRef, contributionPayload);
      });

      const totalSaved = plan.totalSaved + addedAmount;
      const totalCompleted = plan.completedItemsCount + newlyCompletedTargets;
      const updatedPlan: Partial<SavingsPlan> = {
        totalSaved,
        progressPercent: calculateSavingsProgress(totalSaved, plan.totalGoal),
        updatedAt: now,
        completedItemsCount: totalCompleted,
        status: totalSaved >= plan.totalGoal ? 'completed' : 'active',
      };

      transaction.update(planRef, updatedPlan);
    });
  }

  private detectDelimiter(sample: string): ',' | ';' | '\t' {
    const delimiters: Array<',' | ';' | '\t'> = [',', ';', '\t'];
    return delimiters.reduce((selected, current) => {
      const selectedCount = sample.split(selected).length;
      const currentCount = sample.split(current).length;
      return currentCount > selectedCount ? current : selected;
    }, ',');
  }

  private normalizeHeader(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
  }

  private parseCurrencyValue(value: string | number): number {
    if (typeof value === 'number') return Math.max(0, Math.trunc(value));
    const digits = value.replace(/[^\d-]/g, '');
    const amount = Number.parseInt(digits, 10);
    return Number.isFinite(amount) ? Math.max(0, amount) : 0;
  }

  private resolveFrequencyLabel(frequency: SavingsPlanGenerationConfig['frequency']): string {
    if (frequency === 'daily') return 'Día';
    if (frequency === 'weekly') return 'Semana';
    if (frequency === 'biweekly') return 'Quincena';
    return 'Mes';
  }

  private createAllocationGroupId(): string {
    return `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
