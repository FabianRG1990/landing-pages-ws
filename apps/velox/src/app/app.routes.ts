import { Route } from '@angular/router';

/**
 * VELOX es multi-segmento: cada ítem del nav es su propia ruta/página
 * (Models, Performance, Design, Technology, Ownership), con una transición
 * cinematográfica entre páginas. La home renderiza directamente en `/` (sin
 * redirect). La feature `inicio` define todas las rutas y se carga lazy.
 */
export const appRoutes: Route[] = [
  { path: '', loadChildren: () => import('@velox-ui-inicio') },
  { path: '**', redirectTo: '' },
];
