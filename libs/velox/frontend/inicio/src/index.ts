// Public API del lib `@velox-ui-inicio`. Default export = rutas (para
// `loadChildren: () => import('@velox-ui-inicio')`). Named para tests/tooling.
export { veloxUiInicioRoutes as default } from './lib/lib.routes';
export * from './lib/lib.routes';
export { HomePage } from './lib/pages/home/home';
export { PerformancePage } from './lib/pages/performance/performance';
export { DesignPage } from './lib/pages/design/design';
export { TechnologyPage } from './lib/pages/technology/technology';
export { OwnershipPage } from './lib/pages/ownership/ownership';
