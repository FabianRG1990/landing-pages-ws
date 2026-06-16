import { Route } from '@angular/router';
import { HistoriaPage } from './pages/historia/historia';

export const cafeRosaUiHistoriaRoutes: Route[] = [
  { path: '', component: HistoriaPage, pathMatch: 'full' },
];
