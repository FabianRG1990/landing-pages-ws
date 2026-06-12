import { Route } from '@angular/router';
import { pageTransitionGuard } from '@vindas-ui-shared';

/**
 * Rutas de la app `vindas` — cada sección vive en su propia lib feature y se
 * carga lazy (default export = rutas). La raíz redirige a `inicio` (URL
 * canónica). `pageTransitionGuard` retiene la activación hasta que el telón
 * cubre, para que el cambio de sección ocurra oculto detrás de la animación.
 */
export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@vindas-ui-inicio'),
  },
  {
    path: 'sobre',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@vindas-ui-sobre'),
  },
  {
    path: 'servicios',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@vindas-ui-servicios'),
  },
  {
    path: 'psicodiagnosticos',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@vindas-ui-psicodiagnosticos'),
  },
  {
    path: 'contacto',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@vindas-ui-contacto'),
  },
  { path: '**', redirectTo: 'inicio' },
];
