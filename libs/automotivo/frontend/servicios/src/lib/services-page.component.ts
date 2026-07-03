import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AutomotivoStore, WHATSAPP_LINK, IconComponent } from '@automotivo-ui-shared';

/** Pantalla "Servicios" — transcripción fiel del artefacto original. */
const SERVICIOS_FULL = [
  { t: 'Mecánica general', d: 'Mantenimiento preventivo completo: motor, fajas, filtros y fluidos. Detectamos a tiempo lo que otros dejan pasar.', ic: ['M14.7 6.3a3.5 3.5 0 00-4.7 4.5l-6.3 6.3a1.8 1.8 0 002.5 2.5l6.3-6.3a3.5 3.5 0 004.5-4.7l-2 2-2-.5-.5-2 2-2z', 'M15.5 15.5l3.5 3.5'] },
  { t: 'Diagnóstico scanner', d: 'Lectura computarizada de la ECU para leer los códigos reales del vehículo. Nada de adivinar.', ic: ['M2.5 4.5h19v12h-19z', 'M6 20h12M12 16.5V20', 'M6 10.5l2.5-2 2 3 2-4 2 3H18'] },
  { t: 'Frenos y suspensión', d: 'Pastillas, discos, amortiguadores y tren delantero. Tu seguridad empieza por aquí.', ic: ['M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17z', 'M12 9a3 3 0 100 6 3 3 0 000-6z'] },
  { t: 'Cambio de aceite', d: 'Aceite y filtro con el grado exacto que pide tu motor, más engrase de puntos clave.', ic: ['M12 3c2.5 3.5 4.5 6 4.5 8.5a4.5 4.5 0 01-9 0C7.5 9 9.5 6.5 12 3z'] },
  { t: 'Aire acondicionado', d: 'Servicio y reparación del A/C: recarga de gas, compresor, fugas y filtros. Recuperamos el frío.', ic: ['M12 3v18', 'M4.5 7.5l15 9', 'M19.5 7.5l-15 9', 'M9 4l3 2 3-2', 'M9 20l3-2 3 2'] },
  { t: 'Electricidad automotriz', d: 'Sistema eléctrico, alternador, batería y luces. Dejamos todo funcionando como debe.', ic: ['M13 2L5 13h6l-1 9 9-12h-6z'] },
  { t: 'Preparación para RTV', d: 'Dejamos tu carro listo para pasar la Revisión Técnica: luces, gases, frenos y todo lo que revisan.', ic: ['M6 3h9l3 3v15H6z', 'M9.5 12.5l1.8 1.8 3.4-3.6'] },
  { t: 'Transporte y domicilio', d: 'Traslado de tu vehículo en plataforma, o recogida y entrega. Vamos hasta donde estés.', ic: ['M2.5 15V8h9v7', 'M11.5 10h4l3 3v2h-2.5', 'M2.5 15h4', 'M8 16.5a1.8 1.8 0 100 .1', 'M16.5 16.5a1.8 1.8 0 100 .1'] },
];

@Component({
  selector: 'amv-services-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './services-page.component.html',
  styleUrl: './services-page.component.scss',
})
export class ServicesPageComponent {
  private readonly store = inject(AutomotivoStore);
  readonly waLink = WHATSAPP_LINK;

  readonly kicker = "display:inline-flex;align-items:center;gap:12px;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#e6e8ec";
  readonly h2Style = "margin:14px 0 0;font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:700;text-transform:uppercase;font-size:clamp(30px,4.6vw,60px);line-height:.98;letter-spacing:.005em";
  readonly lead = "max-width:600px;margin:22px 0 0;font-family:'Manrope',sans-serif;font-size:17px;line-height:1.7;color:#a9adb3";
  readonly outlineStyle = "display:inline-flex;align-items:center;gap:9px;padding:15px 28px;border-radius:13px;border:1px solid rgba(255,255,255,.16);color:#F2F3F5;font-family:'Manrope',sans-serif;font-weight:600;font-size:14.5px;background:rgba(255,255,255,.02)";

  readonly services = SERVICIOS_FULL.map((s, i) => ({ ...s, n: String(i + 1).padStart(2, '0') }));

  goContacto(): void { this.store.go('contacto'); }
}
