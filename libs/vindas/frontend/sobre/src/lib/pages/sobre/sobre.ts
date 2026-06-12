import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18n, RevealDirective } from '@vindas-ui-shared';

/** 02 · Sobre mí — bio, formación y experiencia. */
@Component({
  selector: 'app-sobre-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './sobre.html',
})
export class SobrePage {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
}
