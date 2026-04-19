import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthenticationPage } from './authentication.page';

const routes: Routes = [{ path: '', component: AuthenticationPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthenticationPageRoutingModule {}
