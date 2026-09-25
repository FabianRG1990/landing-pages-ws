import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('@adn-business-ui-inicio').then((m) => m.HomeComponent),
  },
  {
    // Esquemas preliminares por programa: existen para mostrar la
    // profundidad prevista del sitio, marcados como demostracion.
    path: 'programa/:programa',
    loadComponent: () =>
      import('@adn-business-ui-inicio').then((m) => m.ProgramaComponent),
  },
  { path: '**', redirectTo: '' },
];
