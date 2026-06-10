import { Route } from '@angular/router';
import { ServiciosPage } from './pages/servicios/servicios';

export const ariasUiServiciosRoutes: Route[] = [
  { path: '', component: ServiciosPage, pathMatch: 'full' },
];
