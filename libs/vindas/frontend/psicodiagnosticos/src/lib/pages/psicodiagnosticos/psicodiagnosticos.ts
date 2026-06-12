import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18n, RevealDirective, whatsappHref } from '@vindas-ui-shared';

/** 04 · Psicodiagnósticos — pruebas estandarizadas por categoría. */
@Component({
  selector: 'app-psicodiagnosticos-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './psicodiagnosticos.html',
})
export class PsicodiagnosticosPage {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly waHref = computed(() => whatsappHref(this.i18n.t().waText));
}
