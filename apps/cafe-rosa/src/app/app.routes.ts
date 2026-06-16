import { Route } from '@angular/router';
import { pageTransitionGuard } from '@cafe-rosa-ui-shared';

/**
 * Rutas de la app `cafe-rosa` (Rosa Café) — cada sección vive en su propia lib
 * feature y se carga lazy (default export = rutas). La raíz redirige a `inicio`
 * (URL canónica). `pageTransitionGuard` retiene la activación hasta que la
 * cortina cubre, para que el cambio de sección ocurra oculto detrás de ella.
 */
export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@cafe-rosa-ui-inicio'),
  },
  {
    path: 'menu',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@cafe-rosa-ui-menu'),
  },
  {
    path: 'historia',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@cafe-rosa-ui-historia'),
  },
  {
    path: 'experiencia',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@cafe-rosa-ui-experiencia'),
  },
  {
    path: 'reservar',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@cafe-rosa-ui-reservar'),
  },
  {
    path: 'contacto',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@cafe-rosa-ui-contacto'),
  },
  { path: '**', redirectTo: 'inicio' },
];
