import { Route } from '@angular/router';
import { OrdenesPage } from './pages/ordenes/ordenes';

export const ordenDeTrabajoAutomotrizUiOrdenesRoutes: Route[] = [
  { path: '', component: OrdenesPage, pathMatch: 'full' },
];
