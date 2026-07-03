/** Ítems de navegación compartidos por el navbar y el menú móvil. */
export interface NavItem {
  /** id de ruta (slug interno de la sección) */
  readonly id: string;
  /** ruta absoluta de la sección; `inicio` es la raíz canónica (`/`) */
  readonly path: string;
  /** etiqueta visible en el navbar de escritorio */
  readonly label: string;
  /** número de orden mostrado en el menú móvil */
  readonly num: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'inicio', path: '/', label: 'Inicio', num: '01' },
  { id: 'menu', path: '/menu', label: 'Menú', num: '02' },
  { id: 'historia', path: '/historia', label: 'Nuestra Historia', num: '03' },
  { id: 'experiencia', path: '/experiencia', label: 'Experiencia', num: '04' },
  { id: 'contacto', path: '/contacto', label: 'Contacto', num: '05' },
];

/** Datos de contacto reutilizables (footer, contacto). */
export const CONTACT = {
  email: 'hola@rosacafe.es',
  emailHref: 'mailto:hola@rosacafe.es',
  phone: '+34 91 234 56 78',
  phoneHref: 'tel:+34912345678',
  address: ['Calle de las Flores 14', '28001 Madrid', 'España'],
  metro: 'Metro: Gran Vía (L1, L5)',
  hoursWeek: 'Lun–Vie: 8:00 — 20:00',
  hoursWeekend: 'Sáb–Dom: 9:00 — 21:00',
  instagram: 'https://www.instagram.com/',
  twitter: 'https://twitter.com/',
  facebook: 'https://www.facebook.com/',
} as const;

/** Columnas de enlaces del pie de página. */
export interface FooterColumn {
  readonly title: string;
  readonly links: readonly { readonly label: string; readonly path: string }[];
}

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    title: 'Experiencias',
    links: [
      { label: 'Brunch Rosa', path: '/experiencia' },
      { label: 'Cafés Especiales', path: '/menu' },
      { label: 'Pastelería', path: '/menu' },
      { label: 'Eventos Privados', path: '/contacto' },
    ],
  },
  {
    title: 'Nosotros',
    links: [
      { label: 'Nuestra Historia', path: '/historia' },
      { label: 'Sostenibilidad', path: '/historia' },
      { label: 'El Equipo', path: '/historia' },
      { label: 'Prensa & Blog', path: '/historia' },
    ],
  },
  {
    title: 'Contacto',
    links: [
      { label: 'Reservar Mesa', path: '/reservar' },
      { label: 'Catering', path: '/contacto' },
      { label: 'Franquicia', path: '/contacto' },
      { label: 'Trabaja con Nosotros', path: '/contacto' },
    ],
  },
];
