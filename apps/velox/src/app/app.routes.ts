import { Route } from '@angular/router';

/**
 * VELOX es multi-segmento: cada ítem del nav es su propia ruta/página
 * (Models, Performance, Design, Technology, Ownership), con una transición
 * cinematográfica entre páginas. La home (`inicio`) es la pieza central:
 * hero + showcase. La feature `inicio` define todas las rutas y se carga lazy.
 */
export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: '', loadChildren: () => import('@velox-ui-inicio') },
  { path: '**', redirectTo: 'inicio' },
];
