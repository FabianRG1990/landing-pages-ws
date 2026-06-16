import { Route } from '@angular/router';
import { ContactoPage } from './pages/contacto/contacto';

export const cafeRosaUiContactoRoutes: Route[] = [
  { path: '', component: ContactoPage, pathMatch: 'full' },
];
