import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AutomotivoStore, BRAND, WHATSAPP_LINK, IconComponent } from '@automotivo-ui-shared';

/** Pantalla "Nosotros" — transcripción fiel del artefacto original. */
const VALORES = [
  { t: 'Honestidad', d: 'Te decimos lo que tu carro necesita —y lo que no. Sin trabajos de más.', ic: ['M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z', 'M9 12l2 2 4-4'] },
  { t: 'Cuidado', d: 'Tratamos cada vehículo con el respeto y la atención de uno propio.', ic: ['M12 20s-7-4.3-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.7-7 9-7 9z'] },
  { t: 'Cercanía', d: 'Atención directa y personal. Aquí hablás con quien repara tu carro.', ic: ['M4 5h16v10H7l-3 3z', 'M8 9h8M8 12h5'] },
  { t: 'Rapidez', d: 'Resolvemos a tiempo, sin sacrificar la calidad del trabajo.', ic: ['M13 2L5 13h6l-1 9 9-12h-6z'] },
];

@Component({
  selector: 'amv-about-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss',
})
export class AboutPageComponent {
  private readonly store = inject(AutomotivoStore);
  readonly waLink = WHATSAPP_LINK;
  readonly fbLink = BRAND.facebook;

  readonly kicker = "display:inline-flex;align-items:center;gap:12px;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#e6e8ec";
  readonly h2Style = "margin:14px 0 0;font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:700;text-transform:uppercase;font-size:clamp(30px,4.6vw,60px);line-height:.98;letter-spacing:.005em";
  readonly outlineStyle = "display:inline-flex;align-items:center;gap:9px;padding:15px 28px;border-radius:13px;border:1px solid rgba(255,255,255,.16);color:#F2F3F5;font-family:'Manrope',sans-serif;font-weight:600;font-size:14.5px;background:rgba(255,255,255,.02)";
  readonly valores = VALORES;

  goContacto(): void { this.store.go('contacto'); }
}
