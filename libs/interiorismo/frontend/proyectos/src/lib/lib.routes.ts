import { Route } from '@angular/router';
import { ProyectosPage } from './pages/proyectos/proyectos';

export const interiorismoUiProyectosRoutes: Route[] = [
  { path: '', component: ProyectosPage, pathMatch: 'full' },
];
