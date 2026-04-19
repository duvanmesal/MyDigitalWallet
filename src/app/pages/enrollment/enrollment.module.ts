import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { EnrollmentPage } from './enrollment.page';
import { EnrollmentPageRoutingModule } from './enrollment-routing.module';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, IonicModule, EnrollmentPageRoutingModule],
  declarations: [EnrollmentPage],
})
export class EnrollmentPageModule {}
