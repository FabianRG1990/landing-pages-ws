import { Route } from '@angular/router';

/**
 * Rutas de la app `orden-de-trabajo-automotriz` — cada pantalla vive en su
 * propia lib feature y se carga lazy (default export = rutas). `nueva-orden`
 * es la raíz canónica: el asesor abre la app para recibir un vehículo.
 */
export const appRoutes: Route[] = [
  {
    path: '',
    loadChildren: () => import('@orden-de-trabajo-automotriz-ui-nueva-orden'),
  },
  {
    path: 'ordenes',
    loadChildren: () => import('@orden-de-trabajo-automotriz-ui-ordenes'),
  },
  {
    path: 'expediente',
    loadChildren: () => import('@orden-de-trabajo-automotriz-ui-expediente'),
  },
  { path: '**', redirectTo: '' },
];
