import { Bilingual } from '../i18n/types';

export interface NavItem {
  readonly id: string;
  readonly label: Bilingual;
  /** Ruta absoluta de la sección. `inicio` es la raíz canónica (`/`). */
  readonly path: string;
  /** Número de orden mostrado en el menú móvil. */
  readonly num: string;
}

export interface PromiseCard {
  readonly num: string;
  readonly icon: string;
  readonly title: Bilingual;
  readonly body: Bilingual;
}

export interface ServiceCard {
  readonly num: string;
  readonly icon: string;
  readonly title: Bilingual;
  readonly body: Bilingual;
}

export interface Review {
  readonly quote: Bilingual;
  readonly tag: Bilingual;
}

export interface WheelSpec {
  readonly label: Bilingual;
  readonly value: string;
}

export interface Wheel {
  readonly img: string;
  /** Medida en pulgadas, usada por el filtro: '14' | '15' | '16'. */
  readonly size: string;
  readonly badge: string;
  readonly name: string;
  readonly finish: Bilingual;
  readonly dotColor: string;
  readonly dotBorder: string;
  readonly specs: readonly WheelSpec[];
  readonly whatsapp: string;
}

export interface GalleryItem {
  readonly category: string;
  readonly jobNum: string;
  readonly icon: string;
  readonly title: Bilingual;
  readonly beforeImg: string;
  readonly afterImg: string;
  readonly caption: Bilingual;
}

export interface Filter {
  readonly id: string;
  readonly label: Bilingual;
}

export interface HoursRow {
  /** Días de la semana (0 = domingo) a los que aplica esta fila. */
  readonly days: readonly number[];
  readonly label: Bilingual;
  readonly value: Bilingual;
  readonly closed: boolean;
}
