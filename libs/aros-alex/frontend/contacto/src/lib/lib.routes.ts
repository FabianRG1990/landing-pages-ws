import { Route } from '@angular/router';
import { ContactoPage } from './pages/contacto/contacto';

export const arosAlexUiContactoRoutes: Route[] = [
  { path: '', component: ContactoPage, pathMatch: 'full' },
];
