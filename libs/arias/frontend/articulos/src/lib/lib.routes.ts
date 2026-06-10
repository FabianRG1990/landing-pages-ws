import { Route } from '@angular/router';
import { ArticulosPage } from './pages/articulos/articulos';

export const ariasUiArticulosRoutes: Route[] = [
  { path: '', component: ArticulosPage, pathMatch: 'full' },
];
