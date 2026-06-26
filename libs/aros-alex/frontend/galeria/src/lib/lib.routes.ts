import { Route } from '@angular/router';
import { GaleriaPage } from './pages/galeria/galeria';

export const arosAlexUiGaleriaRoutes: Route[] = [
  { path: '', component: GaleriaPage, pathMatch: 'full' },
];
