import { Route } from '@angular/router';
import { pageTransitionGuard } from '@aros-alex-ui-shared';

/**
 * Rutas de la app `aros-alex` — cada sección vive en su propia lib feature y se
 * carga lazy (default export = rutas). `inicio` es la raíz canónica y se sirve
 * en `/` (la landing aterriza ahí, sin redirección). `pageTransitionGuard`
 * retiene la activación hasta que la cortina cubre, para que el cambio de
 * sección ocurra oculto detrás de la animación.
 */
export const appRoutes: Route[] = [
  {
    path: '',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@aros-alex-ui-inicio'),
  },
  {
    path: 'servicios',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@aros-alex-ui-servicios'),
  },
  {
    path: 'galeria',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@aros-alex-ui-galeria'),
  },
  {
    path: 'nosotros',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@aros-alex-ui-nosotros'),
  },
  {
    path: 'contacto',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@aros-alex-ui-contacto'),
  },
  { path: '**', redirectTo: '' },
];
