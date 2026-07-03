import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AutomotivoStore, BrandService, ScreenId } from '../core';
import { MAIL_LINK, MAPS_DIR_LINK, WHATSAPP_LINK, BRAND } from '../core/brand';
import { IconComponent } from '../ui/icon.component';

@Component({
  selector: 'amv-site-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss',
})
export class SiteFooterComponent {
  private readonly store = inject(AutomotivoStore);
  readonly brand = inject(BrandService);
  readonly waLink = WHATSAPP_LINK;
  readonly mailLink = MAIL_LINK;
  readonly mapsDir = MAPS_DIR_LINK;
  readonly telLink = 'tel:' + BRAND.phoneRaw;
  readonly fb = BRAND.facebook;
  readonly ig = BRAND.instagram;
  readonly wa = BRAND.whatsapp;
  readonly tel = BRAND.phone;
  readonly email = BRAND.email;
  readonly year = this.brand.year;

  readonly explore: { id: ScreenId; label: string }[] = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'galeria', label: 'Galería' },
    { id: 'nosotros', label: 'Nosotros' },
    { id: 'contacto', label: 'Contacto' },
  ];
  readonly svcLinks = [
    'Mecánica general', 'Diagnóstico scanner', 'Frenos y suspensión',
    'Aire acondicionado', 'Preparación RTV',
  ];

  go(id: ScreenId): void { this.store.go(id); }
  scrollTop(): void { window.scrollTo({ top: 0, behavior: 'smooth' }); }
}
