import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authorizationGuard } from './core/guards/authorization.guard';
import { sessionRedirectGuard } from './core/guards/session-redirect.guard';

const routes: Routes = [
  {
    path: 'authentication',
    canActivate: [sessionRedirectGuard],
    loadChildren: () => import('./pages/authentication/authentication.module').then((m) => m.AuthenticationPageModule),
  },
  {
    path: 'enrollment',
    canActivate: [sessionRedirectGuard],
    loadChildren: () =>
      import('./pages/enrollment/enrollment.module').then((m) => m.EnrollmentPageModule),
  },
  {
    path: 'dashboard',
    canActivate: [authorizationGuard],
    loadChildren: () => import('./pages/dashboard/dashboard.module').then((m) => m.DashboardPageModule),
  },
  {
    path: 'add-payment-method',
    canActivate: [authorizationGuard],
    loadChildren: () =>
      import('./pages/add-payment-method/add-payment-method.module').then((m) => m.AddPaymentMethodPageModule),
  },
  {
    path: 'transaction',
    canActivate: [authorizationGuard],
    loadChildren: () =>
      import('./pages/transaction/transaction.module').then((m) => m.TransactionPageModule),
  },
  {
    path: 'movement-history',
    canActivate: [authorizationGuard],
    loadChildren: () =>
      import('./pages/movement-history/movement-history.module').then((m) => m.MovementHistoryPageModule),
  },
  {
    path: 'savings/:planId',
    canActivate: [authorizationGuard],
    loadChildren: () =>
      import('./pages/savings-plan-detail/savings-plan-detail.module').then((m) => m.SavingsPlanDetailPageModule),
  },
  {
    path: 'savings',
    canActivate: [authorizationGuard],
    loadChildren: () => import('./pages/savings/savings.module').then((m) => m.SavingsPageModule),
  },
  { path: '', redirectTo: 'authentication', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
