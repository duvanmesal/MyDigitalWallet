import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SavingsPlanDetailPage } from './savings-plan-detail.page';

const routes: Routes = [
  {
    path: '',
    component: SavingsPlanDetailPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SavingsPlanDetailPageRoutingModule {}
