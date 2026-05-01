import { Route } from '@angular/router';

import { ContactoPage } from './pages/contacto/contacto';
import { EspeciesPage } from './pages/especies/especies';
import { ExhibicionesPage } from './pages/exhibiciones/exhibiciones';
import { HomePage } from './pages/home/home';

export const appRoutes: Route[] = [
  { path: '', component: HomePage, pathMatch: 'full' },
  { path: 'exhibiciones', component: ExhibicionesPage },
  { path: 'especies', component: EspeciesPage },
  { path: 'contacto', component: ContactoPage },
  { path: '**', redirectTo: '' },
];
