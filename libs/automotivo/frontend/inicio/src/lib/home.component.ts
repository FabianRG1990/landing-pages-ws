import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AutomotivoStore, BRAND, WHATSAPP_LINK, IconComponent } from '@automotivo-ui-shared';

/** Parte inferior de la pantalla "inicio": Servicios (zigzag), Reseñas y CTA.
 *  Transcripción fiel del artefacto original. */
interface Zig {
  n: string; t: string; d: string; icon: string[]; src: string;
  cols: string; mediaWrap: string; textWrap: string; mediaRv: string; textRv: string; cta: string;
}
type RevKind = 'fb' | 'ig' | 'google';
interface Rev { name: string; kind: RevKind; text: string; chip: string; plat: string; }

const SVC = [
  { t: 'Mecánica general', d: 'Mantenimiento preventivo, motor, fajas y filtros.', src: 'assets/mecanica-general.jpg',
    ic: ['M14.7 6.3a3.5 3.5 0 00-4.7 4.5l-6.3 6.3a1.8 1.8 0 002.5 2.5l6.3-6.3a3.5 3.5 0 004.5-4.7l-2 2-2-.5-.5-2z', 'M15.5 15.5l3.5 3.5'] },
  { t: 'Diagnóstico scanner', d: 'Lectura computarizada de la ECU. Sin adivinar.', src: 'assets/scanner.jpg',
    ic: ['M2.5 4.5h19v12h-19z', 'M6 20h12M12 16.5V20', 'M6 10.5l2.5-2 2 3 2-4 2 3H18'] },
  { t: 'Frenos y suspensión', d: 'Pastillas, discos, amortiguadores y tren delantero.', src: 'assets/frenos.jpg',
    ic: ['M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17z', 'M12 9a3 3 0 100 6 3 3 0 000-6z'] },
  { t: 'Aire acondicionado', d: 'Servicio y reparación completa del A/C: recarga de gas, compresor, fugas, condensador y filtros. Recuperamos el frío de tu carro.', src: 'assets/aire.jpg',
    ic: ['M12 3v18', 'M4.5 7.5l15 9', 'M19.5 7.5l-15 9', 'M9 4l3 2 3-2', 'M9 20l3-2 3 2', 'M4.7 9.7l.3 3.4 3-1.6', 'M19.3 9.7l-.3 3.4-3-1.6'] },
];

const REV_DATA: { name: string; kind: RevKind; text: string }[] = [
  { name: 'Andrés M.', kind: 'fb', text: 'Excelentes, muy honestos. Me explicaron todo antes de trabajar y el precio fue justo. 100% recomendados.' },
  { name: 'María F.', kind: 'ig', text: 'Me dejaron el aire acondicionado como nuevo, enfría durísimo otra vez. Atención de primera.' },
  { name: 'Jose R.', kind: 'google', text: 'Rápidos y claros con el diagnóstico. Mi taller de confianza en Heredia, sin duda.' },
  { name: 'Kimberly S.', kind: 'fb', text: 'Súper amables y profesionales. Me hicieron el servicio completo y quedó impecable.' },
  { name: 'Carlos V.', kind: 'google', text: 'Llevé el carro por un ruido en los frenos, lo resolvieron el mismo día. Muy recomendados.' },
  { name: 'Daniela C.', kind: 'ig', text: 'Confianza total. Te explican qué necesita el carro y qué no, sin trabajos de más.' },
  { name: 'Luis A.', kind: 'google', text: 'El scanner detectó la falla al toque. Trabajo limpio y buen trato. Volveré.' },
  { name: 'Natalia P.', kind: 'fb', text: 'De los mejores talleres de la zona. Serios, puntuales y con buenos precios.' },
];

@Component({
  selector: 'amv-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly store = inject(AutomotivoStore);
  readonly waLink = WHATSAPP_LINK;
  readonly fbLink = BRAND.facebook;
  readonly igLink = BRAND.instagram;

  readonly h2Style = "margin:14px 0 0;font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:700;text-transform:uppercase;font-size:clamp(30px,4.6vw,60px);line-height:.98;letter-spacing:.005em";
  readonly outlineStyle = "display:inline-flex;align-items:center;gap:9px;padding:15px 28px;border-radius:13px;border:1px solid rgba(255,255,255,.16);color:#F2F3F5;font-family:'Manrope',sans-serif;font-weight:600;font-size:14.5px;background:rgba(255,255,255,.02)";
  readonly revCard = 'width:clamp(290px,80vw,380px);flex-shrink:0;padding:24px 24px 22px;border-radius:18px;background:linear-gradient(160deg,rgba(255,255,255,.055),rgba(255,255,255,.012));border:1px solid rgba(255,255,255,.09);box-shadow:0 12px 34px rgba(0,0,0,.35)';

  readonly zig: Zig[] = SVC.map((m, i) => {
    const rev = i % 2 === 1;
    return {
      n: String(i + 1).padStart(2, '0'), t: m.t, d: m.d, icon: m.ic, src: m.src,
      cols: rev ? '1fr 1.1fr' : '1.1fr 1fr',
      mediaWrap: rev ? 'grid-column:2' : 'grid-column:1',
      textWrap: rev ? 'grid-column:1;grid-row:1' : 'grid-column:2',
      mediaRv: rev ? 'r' : 'l', textRv: rev ? 'l' : 'r',
      cta: 'Ver servicio',
    };
  });

  private readonly chipOf = (k: RevKind) => k === 'fb' ? 'rgba(24,119,242,.16)' : k === 'ig' ? 'rgba(225,48,108,.16)' : 'rgba(255,255,255,.08)';
  private readonly platOf = (k: RevKind) => k === 'fb' ? 'Reseña en Facebook' : k === 'ig' ? 'Comentario en Instagram' : 'Reseña en Google';
  private readonly revData: Rev[] = REV_DATA.map((r) => ({ ...r, chip: this.chipOf(r.kind), plat: this.platOf(r.kind) }));
  readonly resenasTop: Rev[] = [...this.revData.slice(0, 4), ...this.revData.slice(0, 4)];
  readonly resenasBottom: Rev[] = [...this.revData.slice(4), ...this.revData.slice(4)];

  go(id: string): void { this.store.go(id as never); }
  goServicios(): void { this.store.go('servicios'); }
  goContacto(): void { this.store.go('contacto'); }
}
