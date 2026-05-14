import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'budget', pathMatch: 'full' },
  { path: 'auth',       loadComponent: () => import('./auth/auth.component').then(m => m.AuthComponent) },
  { path: 'budget',     loadComponent: () => import('./monthly-budget/monthly-budget.component').then(m => m.MonthlyBudgetComponent), canActivate: [authGuard] },
  { path: 'summary',    loadComponent: () => import('./annual-summary/annual-summary.component').then(m => m.AnnualSummaryComponent),  canActivate: [authGuard] },
  { path: 'accounts',   loadComponent: () => import('./accounts/accounts.component').then(m => m.AccountsComponent),                  canActivate: [authGuard] },
  { path: 'accounts/:id', loadComponent: () => import('./account-detail/account-detail.component').then(m => m.AccountDetailComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: 'budget' },
];
