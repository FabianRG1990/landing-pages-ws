import { Route } from '@angular/router';
import { SobrePage } from './pages/sobre/sobre';

export const ariasUiSobreRoutes: Route[] = [
  { path: '', component: SobrePage, pathMatch: 'full' },
];
