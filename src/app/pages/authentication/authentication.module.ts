import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AuthenticationPage } from './authentication.page';
import { AuthenticationPageRoutingModule } from './authentication-routing.module';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, IonicModule, AuthenticationPageRoutingModule],
  declarations: [AuthenticationPage],
})
export class AuthenticationPageModule {}
