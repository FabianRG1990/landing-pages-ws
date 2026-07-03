import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  AutomotivoStore, BrandService, AppointmentForm,
  MAIL_LINK, MAPS_DIR_LINK, MAPS_EMBED_SRC, WHATSAPP_LINK,
} from '@automotivo-ui-shared';

/** Pantalla "Contacto" — form de cita + calendario + rail + mapa + diálogo de
 *  servicios + modal PDF. Transcripción fiel del artefacto original; la lógica
 *  reusa el AutomotivoStore. */
const MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const PDF_SVC = ['Mecánica general', 'Mantenimiento preventivo', 'Diagnóstico por scanner', 'Frenos y suspensión', 'Cambio de aceite', 'Aire acondicionado', 'Electricidad automotriz', 'Preparación para RTV', 'Servicio a domicilio'];
const SVC_META: { d: string; ic: string[] }[] = [
  { d: 'Motor, fajas, filtros y fluidos.', ic: ['M14.7 6.3a3.5 3.5 0 00-4.7 4.5l-6.3 6.3a1.8 1.8 0 002.5 2.5l6.3-6.3a3.5 3.5 0 004.5-4.7l-2 2-2-.5-.5-2z', 'M15.5 15.5l3.5 3.5'] },
  { d: 'Revisión periódica programada.', ic: ['M9 11l2 2 4-4', 'M12 3a9 9 0 100 18 9 9 0 000-18z'] },
  { d: 'Lectura computarizada de la ECU.', ic: ['M2.5 4.5h19v12h-19z', 'M6 20h12M12 16.5V20', 'M6 10.5l2.5-2 2 3 2-4 2 3H18'] },
  { d: 'Pastillas, discos y amortiguadores.', ic: ['M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17z', 'M12 9a3 3 0 100 6 3 3 0 000-6z'] },
  { d: 'Aceite y filtro al grado correcto.', ic: ['M12 3c2.5 3.5 4.5 6 4.5 8.5a4.5 4.5 0 01-9 0C7.5 9 9.5 6.5 12 3z'] },
  { d: 'Servicio, recarga de gas y compresor.', ic: ['M12 3v18', 'M4.5 7.5l15 9', 'M19.5 7.5l-15 9', 'M9 4l3 2 3-2', 'M9 20l3-2 3 2'] },
  { d: 'Alternador, batería y luces.', ic: ['M13 2L5 13h6l-1 9 9-12h-6z'] },
  { d: 'Listo para la Revisión Técnica.', ic: ['M6 3h9l3 3v15H6z', 'M9.5 12.5l1.8 1.8 3.4-3.6'] },
  { d: 'Recogemos y entregamos, o vamos hasta vos.', ic: ['M2.5 15V8h9v7', 'M11.5 10h4l3 3v2h-2.5', 'M2.5 15h4'] },
];
const SLOTS_M = ['8:00 a. m.', '9:00 a. m.', '10:00 a. m.', '11:00 a. m.'];
const SLOTS_T = ['1:00 p. m.', '2:00 p. m.', '3:00 p. m.', '4:00 p. m.', '5:00 p. m.'];
const pad2 = (n: number) => String(n).padStart(2, '0');

@Component({
  selector: 'amv-contact-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-page.component.html',
  styleUrl: './contact-page.component.scss',
})
export class ContactPageComponent {
  readonly store = inject(AutomotivoStore);
  private readonly brand = inject(BrandService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly waLink = WHATSAPP_LINK;
  readonly mailLink = MAIL_LINK;
  readonly mapLink = MAPS_DIR_LINK;
  readonly f = this.store.form;
  readonly calOpen = this.store.calOpen;
  readonly svcOpen = this.store.svcOpen;
  readonly pdfOpen = this.store.pdfOpen;
  readonly pdfFolio = this.store.pdfFolio;
  readonly formErr = this.store.formErr;
  readonly formErrList = this.store.formErrList;
  readonly openNow = this.brand.isOpenNow();

  // ---- style strings (del original) ----
  readonly kicker = "display:inline-flex;align-items:center;gap:12px;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#e6e8ec";
  readonly h2Style = "margin:14px 0 0;font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:700;text-transform:uppercase;font-size:clamp(30px,4.6vw,60px);line-height:.98;letter-spacing:.005em";
  readonly lead = "max-width:600px;margin:22px 0 0;font-family:'Manrope',sans-serif;font-size:17px;line-height:1.7;color:#a9adb3";
  readonly fsec = "font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#E11D2E;margin-bottom:13px";
  readonly field = 'display:flex;flex-direction:column;gap:7px';
  readonly label = "font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:#9a9da3";
  readonly input = "width:100%;padding:12px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.28);color:#F2F3F5;font-family:'Manrope',sans-serif;font-size:14.5px;outline:none";
  readonly calNav = 'display:inline-flex;width:34px;height:34px;border-radius:9px;align-items:center;justify-content:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#dfe1e5;cursor:pointer';
  readonly ctCard = 'display:flex;align-items:center;gap:15px;padding:16px 18px;border-radius:16px;text-decoration:none;border:1px solid rgba(255,255,255,.09);background:linear-gradient(168deg,rgba(255,255,255,.05),rgba(255,255,255,.012))';
  readonly ctIco = 'display:inline-flex;width:46px;height:46px;flex-shrink:0;border-radius:13px;align-items:center;justify-content:center;background:rgba(225,29,46,.13);border:1px solid rgba(225,29,46,.26);color:#e6e8ec';
  readonly ctIcoSm = 'display:inline-flex;width:34px;height:34px;flex-shrink:0;border-radius:10px;align-items:center;justify-content:center;background:rgba(225,29,46,.12);border:1px solid rgba(225,29,46,.24)';
  readonly ctK = "display:block;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:#8b8e94";
  readonly ctV = "display:block;font-family:'Manrope',sans-serif;font-weight:700;font-size:17px;color:#F2F3F5;margin-top:1px;font-variant-numeric:tabular-nums";
  readonly ctArrow = 'display:inline-flex;align-items:center;color:#6b6e74;flex-shrink:0';

  readonly horario = [
    { d: 'Lunes a Viernes', h: '8:00 a. m. – 6:00 p. m.', c: '#c9ccd1' },
    { d: 'Sábado', h: 'Cerrado', c: '#e06a6a' },
    { d: 'Domingo', h: 'Cerrado', c: '#e06a6a' },
  ];
  readonly openText = computed(() => (this.openNow ? 'Abierto ahora' : 'Cerrado ahora'));
  readonly openBadge = computed(() =>
    'display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:100px;font-family:\'Manrope\',sans-serif;font-weight:700;font-size:11.5px;color:' +
    (this.openNow ? '#3ad07a' : '#e06a6a') + ';background:' + (this.openNow ? 'rgba(58,208,122,.12)' : 'rgba(224,106,106,.12)') +
    ';border:1px solid ' + (this.openNow ? 'rgba(58,208,122,.3)' : 'rgba(224,106,106,.3)'));

  readonly mapSrc: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(MAPS_EMBED_SRC);
  readonly pdfSrc = computed<SafeResourceUrl | null>(() => {
    const u = this.store.pdfUrl();
    return u ? this.sanitizer.bypassSecurityTrustResourceUrl(u) : null;
  });

  // ---- fecha / calendario ----
  private readonly today0 = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); })();
  private readonly cy = () => this.store.calY() ?? new Date().getFullYear();
  private readonly cm = () => this.store.calM() ?? new Date().getMonth();
  readonly calMonthLabel = computed(() => MES[this.cm()] + ' ' + this.cy());
  readonly calDows = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  readonly fechaLabel = computed(() => {
    const iso = this.f().fecha;
    if (!iso) return 'Elegí una fecha';
    const p = iso.split('-');
    return p[2] + ' ' + MES[parseInt(p[1], 10) - 1].slice(0, 3) + ' ' + p[0];
  });
  readonly pickBtn = computed(() =>
    'width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:11px;border:1px solid ' +
    (this.calOpen() ? 'rgba(225,29,46,.5)' : 'rgba(255,255,255,.12)') + ';background:rgba(0,0,0,.28);cursor:pointer');
  readonly pickVal = computed(() =>
    "font-family:'Manrope',sans-serif;font-size:14.5px;color:" + (this.f().fecha ? '#F2F3F5' : '#7c7f85'));

  readonly calCells = computed(() => {
    const y = this.cy(), m = this.cm();
    const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
    const daysIn = new Date(y, m + 1, 0).getDate();
    const cellBase = "height:38px;border-radius:9px;font-family:'Manrope',sans-serif;font-weight:600;font-size:13.5px;border:1px solid transparent;transition:all .15s;";
    const cells: { d: string; iso?: string; disabled: boolean; style: string }[] = [];
    for (let i = 0; i < firstDow; i++) cells.push({ d: '', disabled: true, style: 'height:38px;background:transparent;border:0;color:transparent;pointer-events:none' });
    for (let d = 1; d <= daysIn; d++) {
      const dt = new Date(y, m, d);
      const dow = dt.getDay();
      const past = dt < this.today0;
      const weekend = (dow === 0 || dow === 6);
      const disabled = past || weekend;
      const iso = y + '-' + pad2(m + 1) + '-' + pad2(d);
      const sel = this.f().fecha === iso;
      const isToday = dt.getTime() === this.today0.getTime();
      let st = cellBase;
      if (disabled) st += 'background:transparent;color:#4a4c52;cursor:not-allowed';
      else if (sel) st += 'background:linear-gradient(135deg,#FF3B41,#E11D2E);color:#fff;cursor:pointer;box-shadow:0 8px 20px rgba(225,29,46,.4)';
      else st += 'background:rgba(255,255,255,.04);color:#dfe1e5;cursor:pointer;' + (isToday ? 'border-color:rgba(225,29,46,.5)' : '');
      cells.push({ d: String(d), iso, disabled, style: st });
    }
    return cells;
  });

  // ---- periodo / hora ----
  readonly periodoOpts = computed(() => {
    const cur = this.f().periodo;
    return ['Mañana', 'Tarde'].map((k) => ({
      k, active: cur === k,
      style: 'flex:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:12px 6px;border-radius:11px;cursor:pointer;font-family:\'Manrope\',sans-serif;font-weight:700;font-size:13.5px;transition:all .18s;border:1px solid ' +
        (cur === k ? 'rgba(225,29,46,.6)' : 'rgba(255,255,255,.12)') + ';background:' + (cur === k ? 'rgba(225,29,46,.16)' : 'rgba(0,0,0,.28)') + ';color:' + (cur === k ? '#fff' : '#a9adb3'),
    }));
  });
  readonly showHoras = computed(() => !!this.f().periodo);
  readonly horaSlots = computed(() => {
    const per = this.f().periodo;
    const raw = per === 'Tarde' ? SLOTS_T : per === 'Mañana' ? SLOTS_M : [];
    const hora = this.f().hora;
    return raw.map((h) => ({
      h, style: 'padding:10px 15px;border-radius:100px;cursor:pointer;font-family:\'Manrope\',sans-serif;font-weight:600;font-size:13px;font-variant-numeric:tabular-nums;transition:all .18s;border:1px solid ' +
        (hora === h ? 'rgba(225,29,46,.6)' : 'rgba(255,255,255,.13)') + ';background:' + (hora === h ? 'linear-gradient(135deg,#E11D2E,#B00D1B)' : 'rgba(255,255,255,.03)') + ';color:' + (hora === h ? '#fff' : '#c3c6cc'),
    }));
  });

  // ---- servicios (trigger + diálogo) ----
  private readonly sel = computed(() => this.f().servicios);
  readonly hasSvc = computed(() => this.sel().length > 0);
  readonly svcSummary = computed(() => {
    const s = this.sel();
    return s.length ? (s.length === 1 ? s[0] : s.length + ' servicios seleccionados') : 'Elegí los servicios que ocupás';
  });
  readonly svcSummaryColor = computed(() => (this.sel().length ? '#F2F3F5' : '#9a9da3'));
  readonly svcBadge = computed(() => (this.sel().length ? String(this.sel().length) : 'Elegir'));
  readonly svcTrigger = computed(() =>
    'width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-radius:14px;border:1px solid ' +
    (this.sel().length ? 'rgba(225,29,46,.4)' : 'rgba(255,255,255,.13)') + ';background:' + (this.sel().length ? 'rgba(225,29,46,.08)' : 'rgba(0,0,0,.28)') + ';cursor:pointer');
  readonly svcTriggerBadge = computed(() =>
    'display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;padding:0 9px;flex-shrink:0;border-radius:100px;font-family:\'Manrope\',sans-serif;font-weight:700;font-size:12.5px;' +
    (this.sel().length ? 'background:linear-gradient(135deg,#FF3B41,#E11D2E);color:#fff' : 'background:rgba(255,255,255,.08);color:#9a9da3'));
  readonly svcSelChips = computed(() => this.sel().map((name) => ({ label: name })));
  readonly svcDialogCount = computed(() => {
    const n = this.sel().length;
    return n ? n + ' ' + (n === 1 ? 'servicio seleccionado' : 'servicios seleccionados') : 'Ningún servicio seleccionado aún';
  });
  readonly svcCards = computed(() => {
    const selected = this.sel();
    return PDF_SVC.map((name, i) => {
      const on = selected.includes(name);
      const meta = SVC_META[i] ?? { d: '', ic: ['M12 3v18'] };
      return {
        t: name, d: meta.d, ic: meta.ic, on,
        style: 'display:flex;align-items:center;gap:12px;padding:14px;border-radius:14px;cursor:pointer;text-align:left;transition:all .16s;border:1px solid ' + (on ? 'rgba(225,29,46,.55)' : 'rgba(255,255,255,.1)') + ';background:' + (on ? 'rgba(225,29,46,.12)' : 'rgba(255,255,255,.025)'),
        iconWrap: 'display:inline-flex;width:42px;height:42px;flex-shrink:0;border-radius:11px;align-items:center;justify-content:center;background:' + (on ? 'linear-gradient(135deg,#E11D2E,#B00D1B)' : 'rgba(225,29,46,.1)') + ';border:1px solid ' + (on ? 'transparent' : 'rgba(225,29,46,.22)'),
        checkWrap: 'display:inline-flex;width:24px;height:24px;flex-shrink:0;border-radius:7px;align-items:center;justify-content:center;transition:all .16s;' + (on ? 'background:#E11D2E;border:1px solid #E11D2E' : 'background:transparent;border:1.5px solid rgba(255,255,255,.22)'),
      };
    });
  });

  // ---- acciones ----
  setField(key: keyof AppointmentForm, ev: Event): void {
    const el = ev.target as HTMLInputElement | HTMLTextAreaElement;
    this.store.setField(key, el.value as never);
  }
  toggleCal(): void { this.store.toggleCal(); }
  calPrev(): void { this.store.calShift(-1); }
  calNext(): void { this.store.calShift(1); }
  pick(cell: { iso?: string; disabled: boolean }): void { if (!cell.disabled && cell.iso) this.store.pickDate(cell.iso); }
  setPeriodo(p: string): void { this.store.setPeriodo(p); }
  pickHora(h: string): void { this.store.pickHora(h); }
  openSvc(): void { this.store.openSvc(); }
  closeSvc(): void { this.store.closeSvc(); }
  clearSvc(): void { this.store.clearServicios(); }
  toggleServicio(name: string): void { this.store.toggleServicio(name); }
  submit(ev: Event): void { ev.preventDefault(); this.store.buildOrder(); }
  closePdf(): void { this.store.closePdf(); }
  downloadPdf(): void { this.store.downloadPdf(); }
  sendWhatsappPdf(): void { this.store.sendWhatsappOrder(); }
  stop(ev: Event): void { ev.stopPropagation(); }
}
