import { Route } from '@angular/router';
import { pageTransitionGuard } from '@arias-ui-shared';

/**
 * Rutas de la app `arias` — cada sección vive en su propia lib feature y se
 * carga lazy (default export = rutas). `inicio` es la raíz canónica y se sirve
 * en `/` (la landing aterriza ahí, sin redirección). `pageTransitionGuard`
 * retiene la activación hasta que la cortina cubre, para que el cambio de
 * sección ocurra oculto detrás de la animación.
 */
export const appRoutes: Route[] = [
  {
    path: '',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@arias-ui-inicio'),
  },
  {
    path: 'sobre',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@arias-ui-sobre'),
  },
  {
    path: 'servicios',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@arias-ui-servicios'),
  },
  {
    path: 'enfoque',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@arias-ui-enfoque'),
  },
  {
    path: 'articulos',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@arias-ui-articulos'),
  },
  {
    path: 'contacto',
    canActivate: [pageTransitionGuard],
    loadChildren: () => import('@arias-ui-contacto'),
  },
  { path: '**', redirectTo: '' },
];
