import { Route } from '@angular/router';

/**
 * Rutas de la app `orden-de-trabajo-automotriz` — cada pantalla vive en su
 * propia lib feature y se carga lazy (default export = rutas).
 *
 * `mecanica` y `pintura` son los tableros kanban propios de cada área.
 * `recibir` y `expediente` son pantallas únicas y compartidas entre ambas
 * áreas (se accede a ellas desde el submenú de cualquiera de las dos, con
 * `?area=` como pista de contexto para preseleccionar el checkbox de área).
 */
export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'mecanica' },
  {
    path: 'mecanica',
    loadChildren: () => import('@orden-de-trabajo-automotriz-ui-tablero-mecanica'),
  },
  {
    path: 'pintura',
    loadChildren: () => import('@orden-de-trabajo-automotriz-ui-tablero-pintura'),
  },
  {
    path: 'recibir',
    loadChildren: () => import('@orden-de-trabajo-automotriz-ui-nueva-orden'),
  },
  {
    path: 'expediente',
    loadChildren: () => import('@orden-de-trabajo-automotriz-ui-expediente'),
  },
  { path: '**', redirectTo: '' },
];
