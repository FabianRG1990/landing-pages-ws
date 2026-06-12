import { Route } from '@angular/router';
import { ServiciosPage } from './pages/servicios/servicios';

export const vindasUiServiciosRoutes: Route[] = [
  { path: '', component: ServiciosPage, pathMatch: 'full' },
];
