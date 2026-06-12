import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n, RevealDirective, whatsappHref } from '@vindas-ui-shared';

/** 01 · Inicio — hero, credenciales y marquee de áreas de acompañamiento. */
@Component({
  selector: 'app-inicio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective],
  templateUrl: './inicio.html',
})
export class InicioPage {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly waHref = computed(() => whatsappHref(this.i18n.t().waText));
  /** Chips duplicados para el loop continuo del marquee. */
  protected readonly chips = computed(() => {
    const c = this.i18n.t().hero.chips;
    return [...c, ...c];
  });
}
