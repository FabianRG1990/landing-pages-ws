import { Route } from '@angular/router';
import { InicioPage } from './pages/inicio/inicio';

export const veloxUiInicioRoutes: Route[] = [
  { path: '', component: InicioPage, pathMatch: 'full' },
];
