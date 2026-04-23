import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../shared/shared.module';
import { SavingsPlanDetailPageRoutingModule } from './savings-plan-detail-routing.module';
import { SavingsPlanDetailPage } from './savings-plan-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    SharedModule,
    SavingsPlanDetailPageRoutingModule,
  ],
  declarations: [SavingsPlanDetailPage],
})
export class SavingsPlanDetailPageModule {}
