import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  AutomotivoStore,
  BrandService,
  AppointmentForm,
  MAIL_LINK,
  MAPS_DIR_LINK,
  MAPS_EMBED_SRC,
  WHATSAPP_LINK,
  BRAND,
  SCHEDULE,
  SERVICES,
  IconComponent,
} from '@automotivo-ui-shared';

const MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MES_AB = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const pad2 = (n: number) => String(n).padStart(2, '0');

@Component({
  selector: 'amv-contact-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './contact-page.component.html',
  styleUrl: './contact-page.component.scss',
})
export class ContactPageComponent {
  readonly store = inject(AutomotivoStore);
  readonly brand = inject(BrandService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly waLink = WHATSAPP_LINK;
  readonly mailLink = MAIL_LINK;
  readonly mapsDir = MAPS_DIR_LINK;
  readonly telLink = 'tel:' + BRAND.phoneRaw;
  readonly wa = BRAND.whatsapp;
  readonly tel = BRAND.phone;
  readonly email = BRAND.email;
  readonly schedule = SCHEDULE;
  readonly services = SERVICES;
  readonly dows = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  readonly periodos = ['Mañana', 'Tarde'];

  readonly mapSrc: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(MAPS_EMBED_SRC);
  readonly pdfSrc = computed<SafeResourceUrl | null>(() => {
    const u = this.store.pdfUrl();
    return u ? this.sanitizer.bypassSecurityTrustResourceUrl(u) : null;
  });

  readonly openNow = this.brand.isOpenNow();
  readonly f = this.store.form;

  // ---- calendario ----
  private readonly today0 = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); })();
  private cy = () => this.store.calY() ?? new Date().getFullYear();
  private cm = () => this.store.calM() ?? new Date().getMonth();
  readonly monthLabel = computed(() => `${MES[this.cm()]} ${this.cy()}`);

  readonly calCells = computed(() => {
    const y = this.cy(), m = this.cm();
    const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
    const daysIn = new Date(y, m + 1, 0).getDate();
    const cells: { d: string; iso?: string; disabled: boolean; selected: boolean; today: boolean }[] = [];
    for (let i = 0; i < firstDow; i++) cells.push({ d: '', disabled: true, selected: false, today: false });
    for (let d = 1; d <= daysIn; d++) {
      const dt = new Date(y, m, d);
      const dow = dt.getDay();
      const disabled = dt < this.today0 || dow === 0 || dow === 6;
      const iso = `${y}-${pad2(m + 1)}-${pad2(d)}`;
      cells.push({ d: String(d), iso, disabled, selected: this.f().fecha === iso, today: dt.getTime() === this.today0.getTime() });
    }
    return cells;
  });

  readonly fechaLabel = computed(() => {
    const iso = this.f().fecha;
    if (!iso) return 'Elegí una fecha';
    const p = iso.split('-');
    return `${+p[2]} ${MES_AB[+p[1] - 1]} ${p[0]}`;
  });

  readonly selectedServices = computed(() => this.f().servicios);
  readonly svcSummary = computed(() => {
    const s = this.f().servicios;
    if (!s.length) return 'Elegí los servicios que ocupás';
    return s.length === 1 ? s[0] : `${s.length} servicios seleccionados`;
  });

  setField<K extends keyof AppointmentForm>(key: K, ev: Event): void {
    const el = ev.target as HTMLInputElement | HTMLTextAreaElement;
    this.store.setField(key, el.value as AppointmentForm[K]);
  }

  pick(cell: { iso?: string; disabled: boolean }): void {
    if (!cell.disabled && cell.iso) this.store.pickDate(cell.iso);
  }

  submit(ev: Event): void {
    ev.preventDefault();
    this.store.buildOrder();
  }
}
