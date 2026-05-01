import { Route } from '@angular/router';
import { HomePage } from './pages/home/home';

export const appRoutes: Route[] = [
  { path: '', component: HomePage, pathMatch: 'full' },
  // Fase 2: stub catch-all que reusa la home placeholder para que el nav
  // pueda navegar entre rutas sin 404 mientras las páginas reales (Fase 3-5)
  // todavía no existen. Reemplazar con rutas explícitas en próximas fases.
  { path: '**', component: HomePage },
];
