import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  EMAIL,
  FB_URL,
  I18n,
  IG_URL,
  PHONE_TEL,
  PHONE_TEL_DISPLAY,
  RevealDirective,
  WHATSAPP_DISPLAY,
  mailtoHref,
  whatsappHref,
} from '@vindas-ui-shared';

/** 05 · Contacto — vías de contacto, formulario (mailto) y mapa. */
@Component({
  selector: 'app-contacto-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './contacto.html',
})
export class ContactoPage {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly waHref = computed(() => whatsappHref(this.i18n.t().waText));
  protected readonly mailto = mailtoHref();
  protected readonly email = EMAIL;
  protected readonly igUrl = IG_URL;
  protected readonly fbUrl = FB_URL;
  protected readonly telHref = 'tel:' + PHONE_TEL;
  protected readonly telDisplay = PHONE_TEL_DISPLAY;
  protected readonly waDisplay = WHATSAPP_DISPLAY;

  private readonly platformId = inject(PLATFORM_ID);

  protected onSubmit(
    event: Event,
    name: string,
    mail: string,
    msg: string,
  ): void {
    event.preventDefault();
    if (!isPlatformBrowser(this.platformId)) return;
    const t = this.i18n.t();
    const subject = encodeURIComponent(t.contacto.mailSubject + name.trim());
    const body = encodeURIComponent(
      msg.trim() + '\n\n' + name.trim() + (mail.trim() ? ' · ' + mail.trim() : ''),
    );
    window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
  }
}
