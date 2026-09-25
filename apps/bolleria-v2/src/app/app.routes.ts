import { Route } from '@angular/router';

/**
 * El sitio es una SPA de una sola vista: el "segmento activo"
 * (inicio · menu · contacto) vive en el `BolleriaStore` y se pinta con
 * `@switch` en el shell (`app.html`), con una cortina entre segmentos.
 * No se usa `router-outlet` — transcripción fiel del original, que
 * tampoco cambia nunca la URL entre pantallas.
 *
 * La ruta raíz vacía monta el shell; cualquier otra URL redirige a ella.
 */
export const appRoutes: Route[] = [
  { path: '', children: [] },
  { path: '**', redirectTo: '' },
];
