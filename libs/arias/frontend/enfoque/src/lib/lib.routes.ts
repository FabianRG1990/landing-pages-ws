import { Route } from '@angular/router';
import { EnfoquePage } from './pages/enfoque/enfoque';

export const ariasUiEnfoqueRoutes: Route[] = [
  { path: '', component: EnfoquePage, pathMatch: 'full' },
];
