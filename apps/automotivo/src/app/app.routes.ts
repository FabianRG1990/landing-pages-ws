import { Route } from '@angular/router';

/**
 * El sitio es una SPA de una sola vista: el "segmento activo"
 * (inicio · servicios · galería · nosotros · contacto) vive en el
 * `AutomotivoStore` y se pinta con `@switch` en el shell (`app.html`),
 * con una cortina cinematográfica entre segmentos. No se usa `router-outlet`.
 *
 * La ruta raíz vacía monta el shell; cualquier otra URL redirige a ella
 * (evitando bucles de redirección al no apuntar `'**'` sobre sí mismo).
 */
export const appRoutes: Route[] = [
  { path: '', children: [] },
  { path: '**', redirectTo: '' },
];
