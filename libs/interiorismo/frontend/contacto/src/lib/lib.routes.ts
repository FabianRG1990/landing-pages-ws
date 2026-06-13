import { Route } from '@angular/router';
import { ContactoPage } from './pages/contacto/contacto';

export const interiorismoUiContactoRoutes: Route[] = [
  { path: '', component: ContactoPage, pathMatch: 'full' },
];
