import { Route } from '@angular/router';

/**
 * VELOX es una landing de una sola página: todo el recorrido (hero → showcase
 * cinemático → features → CTA) vive en un único scroll continuo, por lo que no
 * se divide en rutas. La feature `inicio` contiene la página completa y se
 * carga lazy (default export = rutas). La raíz redirige a `inicio` (URL
 * canónica) para mantener la convención del monorepo.
 */
export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    loadChildren: () => import('@velox-ui-inicio'),
  },
  { path: '**', redirectTo: 'inicio' },
];
