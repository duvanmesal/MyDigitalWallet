import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { TransactionPage } from './transaction.page';
import { TransactionPageRoutingModule } from './transaction-routing.module';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, IonicModule, TransactionPageRoutingModule, SharedModule],
  declarations: [TransactionPage],
})
export class TransactionPageModule {}
