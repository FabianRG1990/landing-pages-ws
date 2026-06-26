import { Route } from '@angular/router';
import { NosotrosPage } from './pages/nosotros/nosotros';

export const arosAlexUiNosotrosRoutes: Route[] = [
  { path: '', component: NosotrosPage, pathMatch: 'full' },
];
