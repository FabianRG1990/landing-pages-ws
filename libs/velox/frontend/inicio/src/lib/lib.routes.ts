import { Route } from '@angular/router';
import { HomePage } from './pages/home/home';
import { PerformancePage } from './pages/performance/performance';
import { DesignPage } from './pages/design/design';
import { TechnologyPage } from './pages/technology/technology';
import { OwnershipPage } from './pages/ownership/ownership';

/**
 * VELOX es multi-segmento: cada segmento es su propia ruta (encabezado + poca
 * info + footer global), con una transición cinematográfica entre páginas
 * (obturador sincronizado). La home (`inicio`) es la pieza central: hero +
 * showcase.
 */
export const veloxUiInicioRoutes: Route[] = [
  { path: 'inicio', component: HomePage },
  { path: 'performance', component: PerformancePage },
  { path: 'design', component: DesignPage },
  { path: 'technology', component: TechnologyPage },
  { path: 'ownership', component: OwnershipPage },
];
