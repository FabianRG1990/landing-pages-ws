import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { AppointmentForm, ScreenId } from './models';
import { PdfService } from './pdf.service';
import { GALLERY_ITEMS, HOUR_SLOTS, SERVICES } from '../data/catalog';

const EMPTY_FORM: AppointmentForm = {
  nombre: '', tel: '', correo: '', placa: '', marca: '', anio: '',
  fecha: '', periodo: '', hora: '', detalle: '', servicios: [],
};

interface AutomotivoState {
  // navegación + cortina cinematográfica
  screen: ScreenId;
  navigating: boolean;
  transLabel: string;
  logoOpacity: number;
  transGlow: number;
  // chrome
  menuOpen: boolean;   // menú móvil
  navOpen: boolean;    // pestaña de navbar contraída (al hacer scroll)
  // galería
  galFilter: string;
  // formulario de cita
  form: AppointmentForm;
  formErr: boolean;
  formErrList: string;
  // diálogos / calendario
  svcOpen: boolean;
  calOpen: boolean;
  calY: number | null;
  calM: number | null;
  // PDF generado
  pdfOpen: boolean;
  pdfUrl: string | null;
  pdfFolio: string | null;
}

const initialState: AutomotivoState = {
  screen: 'inicio',
  navigating: false,
  transLabel: 'Automotivo',
  logoOpacity: 0,
  transGlow: 0,
  menuOpen: false,
  navOpen: false,
  galFilter: 'todos',
  form: { ...EMPTY_FORM },
  formErr: false,
  formErrList: '',
  svcOpen: false,
  calOpen: false,
  calY: null,
  calM: null,
  pdfOpen: false,
  pdfUrl: null,
  pdfFolio: null,
};

export const AutomotivoStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed((store) => ({
    visibleGallery: computed(() => {
      const f = store.galFilter();
      return GALLERY_ITEMS.filter((it) => f === 'todos' || it.category === f);
    }),
    hasServices: computed(() => store.form().servicios.length > 0),
    hourSlots: computed(() => HOUR_SLOTS[store.form().periodo] ?? []),
  })),

  withMethods((store) => {
    const pdf = inject(PdfService);
    let _blobUrl: string | null = null;

    /** Cambia de segmento con la cortina de marca (screen swap a mitad de animación). */
    function go(id: ScreenId): void {
      if (id === store.screen() && !store.menuOpen()) return;
      const label = 'Automotivo';
      patchState(store, {
        navigating: true, menuOpen: false, logoOpacity: 0, transGlow: 0, transLabel: label,
      });
      setTimeout(() => patchState(store, { logoOpacity: 1 }), 260);
      setTimeout(() => patchState(store, { transGlow: 1 }), 440);
      setTimeout(() => patchState(store, { screen: id }), 820);
      setTimeout(() => patchState(store, { navigating: false }), 1080);
      setTimeout(() => patchState(store, { logoOpacity: 0, transGlow: 0 }), 1520);
    }

    return {
      go,
      toggleMobileMenu: () => patchState(store, { menuOpen: !store.menuOpen() }),
      setNavOpen: (v: boolean) => patchState(store, { navOpen: v }),

      // ---- galería ----
      setFilter: (key: string) => patchState(store, { galFilter: key }),

      // ---- formulario ----
      setField<K extends keyof AppointmentForm>(key: K, value: AppointmentForm[K]) {
        patchState(store, { form: { ...store.form(), [key]: value } });
      },
      toggleServicio(name: string) {
        const cur = store.form().servicios;
        const next = cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name];
        patchState(store, { form: { ...store.form(), servicios: next } });
      },
      clearServicios: () => patchState(store, { form: { ...store.form(), servicios: [] } }),

      // ---- diálogo de servicios ----
      openSvc: () => patchState(store, { svcOpen: true }),
      closeSvc: () => patchState(store, { svcOpen: false }),

      // ---- calendario ----
      toggleCal: () => patchState(store, { calOpen: !store.calOpen() }),
      calShift(delta: number) {
        const now = new Date();
        let y = store.calY() ?? now.getFullYear();
        let m = (store.calM() ?? now.getMonth()) + delta;
        y += Math.floor(m / 12);
        m = ((m % 12) + 12) % 12;
        patchState(store, { calY: y, calM: m });
      },
      pickDate(iso: string) {
        patchState(store, { form: { ...store.form(), fecha: iso }, calOpen: false });
      },
      setPeriodo(p: string) {
        patchState(store, { form: { ...store.form(), periodo: p, hora: '' } });
      },
      pickHora(h: string) {
        patchState(store, { form: { ...store.form(), hora: h } });
      },

      // ---- generar orden PDF ----
      /** Valida y, si todo está, genera el PDF y abre la previsualización. Devuelve la lista de faltantes. */
      buildOrder(): string[] {
        const f = store.form();
        const miss: string[] = [];
        if (!f.nombre.trim()) miss.push('nombre');
        if (!f.tel.trim()) miss.push('teléfono');
        if (!f.marca.trim()) miss.push('marca y modelo');
        if (!String(f.anio).trim()) miss.push('año');
        if (!f.fecha) miss.push('fecha');
        if (!f.periodo || !f.hora) miss.push('horario');
        if (!f.servicios.length) miss.push('al menos un servicio');
        if (miss.length) {
          patchState(store, { formErr: true, formErrList: miss.join(', ') });
          return miss;
        }
        const order = pdf.buildOrder(f);
        if (_blobUrl) { try { URL.revokeObjectURL(_blobUrl); } catch { /* noop */ } }
        _blobUrl = order.url;
        patchState(store, {
          formErr: false, pdfOpen: true, pdfUrl: order.url, pdfFolio: order.folio,
        });
        return [];
      },
      closePdf: () => patchState(store, { pdfOpen: false }),
      downloadPdf: () => pdf.lastOrder?.save(),
      sendWhatsappOrder() {
        pdf.lastOrder?.save();
        window.open(pdf.whatsappText(store.form()), '_blank', 'noopener');
      },

      /** Servicios canónicos para pintar el diálogo. */
      catalog: () => SERVICES,
    };
  }),
);
