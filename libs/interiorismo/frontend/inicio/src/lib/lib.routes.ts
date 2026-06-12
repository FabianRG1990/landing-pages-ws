import { Route } from '@angular/router';
import { InicioPage } from './pages/inicio/inicio';

export const interiorismoUiInicioRoutes: Route[] = [
  { path: '', component: InicioPage, pathMatch: 'full' },
];
