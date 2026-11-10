import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./inicio/inicio').then((m) => m.Inicio),
  },
  { path: '**', redirectTo: '' },
];
