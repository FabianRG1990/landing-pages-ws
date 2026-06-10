import { Route } from '@angular/router';
import { ContactoPage } from './pages/contacto/contacto';

export const ariasUiContactoRoutes: Route[] = [
  { path: '', component: ContactoPage, pathMatch: 'full' },
];
