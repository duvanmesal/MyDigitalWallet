import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MovementHistoryPage } from './movement-history.page';

const routes: Routes = [{ path: '', component: MovementHistoryPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MovementHistoryPageRoutingModule {}
