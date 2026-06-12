import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../../i18n/i18n.service';
import {
  EMAIL,
  FB_URL,
  IG_URL,
  NAV_ITEMS,
  PHONE_TEL,
  PHONE_TEL_DISPLAY,
  WHATSAPP_DISPLAY,
  mailtoHref,
  whatsappHref,
} from '../../data/site';

/** Pie de página global (presente en todas las secciones, como en el sitio original). */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './footer.html',
})
export class Footer {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly items = NAV_ITEMS;

  protected readonly waHref = computed(() => whatsappHref(this.i18n.t().waText));
  protected readonly mailto = mailtoHref();
  protected readonly email = EMAIL;
  protected readonly igUrl = IG_URL;
  protected readonly fbUrl = FB_URL;
  protected readonly telHref = 'tel:' + PHONE_TEL;
  protected readonly telDisplay = PHONE_TEL_DISPLAY;
  protected readonly waDisplay = WHATSAPP_DISPLAY;
  protected readonly year = 2026;
}
