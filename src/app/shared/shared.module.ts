import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PaymentCardComponent } from './components/payment-card/payment-card.component';
import { MovementHistoryComponent } from './components/movement-history/movement-history.component';
import { FundsDisplayComponent } from './components/funds-display/funds-display.component';
import { MainActionsComponent } from './components/main-actions/main-actions.component';
import { LoadingPlaceholderComponent } from './components/loading-placeholder/loading-placeholder.component';
import { CustomInputComponent } from './components/custom-input/custom-input.component';
import { TransactionItemComponent } from './components/transaction-item/transaction-item.component';
import { PaymentSimulatorComponent } from './components/payment-simulator/payment-simulator.component';
import { DateSelectorComponent } from './components/date-selector/date-selector.component';

const COMPONENTS = [
  PaymentCardComponent,
  MovementHistoryComponent,
  FundsDisplayComponent,
  MainActionsComponent,
  LoadingPlaceholderComponent,
  CustomInputComponent,
  TransactionItemComponent,
  PaymentSimulatorComponent,
  DateSelectorComponent,
];

@NgModule({
  declarations: COMPONENTS,
  imports: [CommonModule, IonicModule, FormsModule, ReactiveFormsModule],
  exports: COMPONENTS,
})
export class SharedModule {}
