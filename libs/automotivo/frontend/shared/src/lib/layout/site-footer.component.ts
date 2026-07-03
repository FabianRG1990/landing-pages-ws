import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AutomotivoStore, BRAND, WHATSAPP_LINK, MAIL_LINK, MAPS_DIR_LINK, ScreenId } from '../core';

/** FOOTER — transcripción fiel del artefacto original. */
@Component({
  selector: 'amv-site-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss',
})
export class SiteFooterComponent {
  private readonly store = inject(AutomotivoStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly waLink = WHATSAPP_LINK;
  readonly fbLink = BRAND.facebook;
  readonly igLink = BRAND.instagram;
  readonly mailLink = MAIL_LINK;
  readonly mapLink = MAPS_DIR_LINK;
  readonly year = new Date().getFullYear();

  readonly socStyle = 'display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:#e6e8ec;text-decoration:none';
  readonly fcol = "margin:0;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:#E11D2E";
  readonly flink = "font-family:'Manrope',sans-serif;font-size:14px;text-decoration:none;width:fit-content";
  readonly flinkRow = 'display:flex;align-items:flex-start;gap:12px;text-decoration:none';
  readonly fico = 'display:inline-flex;width:34px;height:34px;flex-shrink:0;border-radius:10px;align-items:center;justify-content:center;background:rgba(225,29,46,.1);border:1px solid rgba(225,29,46,.22)';
  readonly fk = "display:block;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#7c7f85";
  readonly fv = "display:block;font-family:'Manrope',sans-serif;font-weight:600;font-size:14.5px;color:#dfe1e5;margin-top:1px;font-variant-numeric:tabular-nums";

  go(id: ScreenId): void { this.store.go(id); }
  scrollTop(): void { if (this.isBrowser) window.scrollTo({ top: 0, behavior: 'smooth' }); }
}
