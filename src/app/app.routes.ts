import { Routes } from '@angular/router';
import { PublicPage } from './public';
export const routes: Routes = [
  { path: '', component: PublicPage, data: { mode: 'home' } },
  { path: 'ambientes', component: PublicPage, data: { mode: 'list' } },
  { path: 'ambientes/:slug', component: PublicPage, data: { mode: 'space' } },
  { path: 'sobre', component: PublicPage, data: { mode: 'about' } },
  { path: 'admin', loadComponent: () => import('./admin').then((m) => m.Admin) },
  { path: '**', redirectTo: '' },
];
