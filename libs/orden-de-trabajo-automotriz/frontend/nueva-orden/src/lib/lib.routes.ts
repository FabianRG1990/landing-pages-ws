import { Route } from '@angular/router';
import { NuevaOrdenPage } from './pages/nueva-orden/nueva-orden';

export const ordenDeTrabajoAutomotrizUiNuevaOrdenRoutes: Route[] = [
  { path: '', component: NuevaOrdenPage, pathMatch: 'full' },
];
