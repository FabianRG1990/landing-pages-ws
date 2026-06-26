import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../icons/icon';
import { CONTACT, NAV_ITEMS } from '../../data/content';
import { COPY } from '../../data/copy';
import { LanguageStore } from '../../i18n/language.store';

/** Pie de página global con marca, navegación, contacto y horario. */
@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  templateUrl: './footer.html',
})
export class SiteFooter {
  protected readonly items = NAV_ITEMS;
  protected readonly contact = CONTACT;
  protected readonly copy = COPY.footer;
  protected readonly L = inject(LanguageStore);
}
