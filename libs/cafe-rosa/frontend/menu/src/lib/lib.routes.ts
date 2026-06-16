import { Route } from '@angular/router';
import { MenuPage } from './pages/menu/menu';

export const cafeRosaUiMenuRoutes: Route[] = [
  { path: '', component: MenuPage, pathMatch: 'full' },
];
