import { Route } from '@angular/router';
import { ReservarPage } from './pages/reservar/reservar';

export const cafeRosaUiReservarRoutes: Route[] = [
  { path: '', component: ReservarPage, pathMatch: 'full' },
];
