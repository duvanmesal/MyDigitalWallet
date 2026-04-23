import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../shared/shared.module';
import { SavingsPageRoutingModule } from './savings-routing.module';
import { SavingsPage } from './savings.page';

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, SharedModule, SavingsPageRoutingModule],
  declarations: [SavingsPage],
})
export class SavingsPageModule {}
