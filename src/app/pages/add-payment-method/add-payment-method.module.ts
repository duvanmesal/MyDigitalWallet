import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AddPaymentMethodPage } from './add-payment-method.page';
import { AddPaymentMethodPageRoutingModule } from './add-payment-method-routing.module';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, IonicModule, AddPaymentMethodPageRoutingModule, SharedModule],
  declarations: [AddPaymentMethodPage],
})
export class AddPaymentMethodPageModule {}
