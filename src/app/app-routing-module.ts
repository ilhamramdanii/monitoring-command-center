import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () =>
      import('./pages/auth/auth.module').then(m => m.AuthModule),
  },
  {
    path: '',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./pages/dashboard/dashboard.module').then(m => m.DashboardModule),
  },
  {
    path: 'detail/:id',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./pages/detail/detail.module').then(m => m.DetailModule),
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
