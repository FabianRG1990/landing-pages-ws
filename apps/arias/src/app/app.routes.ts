import { Route } from '@angular/router';

/**
 * Rutas de la app `arias` — cada sección vive en su propia lib feature y se
 * carga lazy (default export = rutas). La raíz '' sirve la portada (inicio)
 * para que el prerender genere contenido real en `/`; además 'inicio' existe
 * como ruta nombrada para la navegación del navbar.
 */
export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    loadChildren: () => import('@arias-ui-inicio'),
  },
  { path: 'inicio', loadChildren: () => import('@arias-ui-inicio') },
  { path: 'sobre', loadChildren: () => import('@arias-ui-sobre') },
  { path: 'servicios', loadChildren: () => import('@arias-ui-servicios') },
  { path: 'enfoque', loadChildren: () => import('@arias-ui-enfoque') },
  { path: 'articulos', loadChildren: () => import('@arias-ui-articulos') },
  { path: 'contacto', loadChildren: () => import('@arias-ui-contacto') },
  { path: '**', redirectTo: '' },
];
