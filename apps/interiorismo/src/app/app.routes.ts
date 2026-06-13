import { Route } from '@angular/router';
import { pageTransitionGuard } from '@interiorismo-ui-shared';

/**
 * Rutas de la app `interiorismo` (Atelier Solano) — cada sección vive en su
 * propia lib feature y se carga lazy (default export = rutas). La raíz redirige
 * a `inicio` (URL canónica). `pageTransitionGuard` retiene la activación hasta
 * que la cortina cubre, para que el cambio de sección ocurra oculto detrás de
 * la animación.
 */
export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@interiorismo-ui-inicio'),
  },
  {
    path: 'proyectos',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@interiorismo-ui-proyectos'),
  },
  {
    path: 'estudio',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@interiorismo-ui-estudio'),
  },
  {
    path: 'servicios',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@interiorismo-ui-servicios'),
  },
  {
    path: 'contacto',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@interiorismo-ui-contacto'),
  },
  { path: '**', redirectTo: 'inicio' },
];
