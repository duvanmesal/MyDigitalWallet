import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { PaymentMethodService } from '../../../core/services/payment-method.service';
import { TransactionService } from '../../../core/services/transaction.service';
import { PaymentMethod } from '../../../core/models/payment.model';

@Component({
  selector: 'app-payment-simulator',
  templateUrl: './payment-simulator.component.html',
  styleUrls: ['./payment-simulator.component.scss'],
  standalone: false,
})
export class PaymentSimulatorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private modalCtrl = inject(ModalController);
  private paymentMethodSvc = inject(PaymentMethodService);

  availableMethods$: Observable<PaymentMethod[]> = this.paymentMethodSvc.paymentMethods$();

  simulationForm = this.fb.nonNullable.group({
    paymentMethodId: ['', Validators.required],
    vendor: ['', [Validators.required, Validators.minLength(2)]],
    transactionAmount: [0, [Validators.required, Validators.min(1000)]],
  });

  ngOnInit(): void {
    this.generateRandom();
  }

  generateRandom(): void {
    const { vendor, transactionAmount } = TransactionService.generateRandomVendorTransaction();
    this.simulationForm.patchValue({ vendor, transactionAmount });
  }

  confirmSimulation(): void {
    if (this.simulationForm.invalid) {
      this.simulationForm.markAllAsTouched();
      return;
    }
    this.modalCtrl.dismiss(this.simulationForm.getRawValue(), 'confirm');
  }

  cancelSimulation(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
