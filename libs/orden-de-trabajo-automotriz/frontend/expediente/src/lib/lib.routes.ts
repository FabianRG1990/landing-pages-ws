import { Route } from '@angular/router';
import { ExpedientePage } from './pages/expediente/expediente';

export const ordenDeTrabajoAutomotrizUiExpedienteRoutes: Route[] = [
  { path: '', component: ExpedientePage, pathMatch: 'full' },
];
