// Tipos de dominio del sitio Automotivo.

export type ScreenId =
  | 'inicio'
  | 'servicios'
  | 'galeria'
  | 'nosotros'
  | 'contacto';

export interface NavItem {
  id: ScreenId;
  label: string;
}

export interface ServiceItem {
  /** clave estable, usada también como categoría de galería cuando aplica */
  key: string;
  title: string;
  /** descripción larga (página Servicios) */
  description: string;
  /** descripción corta (diálogo de cita) */
  short: string;
  /** paths de un ícono SVG de 24x24 (stroke) */
  icon: string[];
}

export interface GalleryCategory {
  key: string;
  label: string;
}

export interface GalleryItem {
  id: string;
  category: string;
  /** ruta de la imagen; vacío = espacio para que el taller arrastre una foto */
  src: string;
  /** destacada (ocupa más espacio en el collage) */
  featured?: boolean;
}

export type ReviewKind = 'fb' | 'ig' | 'google';

export interface Review {
  name: string;
  kind: ReviewKind;
  text: string;
}

export interface AboutStat {
  title: string;
  detail: string;
}

export interface ScheduleRow {
  day: string;
  hours: string;
  closed?: boolean;
}

/** Formulario de solicitud de cita. */
export interface AppointmentForm {
  nombre: string;
  tel: string;
  correo: string;
  placa: string;
  marca: string;
  anio: string;
  /** ISO yyyy-mm-dd */
  fecha: string;
  /** 'Mañana' | 'Tarde' */
  periodo: string;
  /** ej. '9:00 a. m.' */
  hora: string;
  detalle: string;
  servicios: string[];
}

export interface GeneratedOrder {
  folio: string;
  filename: string;
  /** blob URL para previsualizar en un iframe */
  url: string;
  /** el jsPDF, para descargar */
  save: () => void;
}
