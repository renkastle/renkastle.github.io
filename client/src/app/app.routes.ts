import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'auth',      loadComponent: () => import('./auth/auth.component').then(m => m.AuthComponent) },
  { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'overview',  loadComponent: () => import('./overview/overview.component').then(m => m.OverviewComponent),  canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' },
];
