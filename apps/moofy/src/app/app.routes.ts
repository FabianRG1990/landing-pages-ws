import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('@moofy-ui-inicio').then((m) => m.HomeComponent),
  },
  {
    path: 'catalogo',
    title: 'Catálogo completo — Moofy',
    loadComponent: () => import('@moofy-ui-inicio').then((m) => m.CatalogoComponent),
  },
  { path: '**', redirectTo: '' },
];
