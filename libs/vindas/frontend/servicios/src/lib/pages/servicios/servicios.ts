import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18n, RevealDirective } from '@vindas-ui-shared';

/** 03 · Servicios — terapias, otros servicios y áreas de consulta. */
@Component({
  selector: 'app-servicios-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './servicios.html',
})
export class ServiciosPage {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
}
