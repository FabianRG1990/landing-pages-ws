import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { PageTransition } from './page-transition.service';

/**
 * Retiene la activación de la ruta hasta que la cortina cubre por completo,
 * de modo que el cambio de sección ocurra oculto detrás de ella. En la carga
 * inicial y con prefers-reduced-motion resuelve de inmediato.
 */
export const pageTransitionGuard: CanActivateFn = () =>
  inject(PageTransition)
    .coverComplete()
    .then(() => true);
