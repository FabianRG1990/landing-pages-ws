import { Route } from '@angular/router';
import { PsicodiagnosticosPage } from './pages/psicodiagnosticos/psicodiagnosticos';

export const vindasUiPsicodiagnosticosRoutes: Route[] = [
  { path: '', component: PsicodiagnosticosPage, pathMatch: 'full' },
];
