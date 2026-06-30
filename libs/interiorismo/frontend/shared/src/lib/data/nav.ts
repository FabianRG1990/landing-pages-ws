/** Ítems de navegación compartidos por el navbar y el menú móvil. */
export interface NavItem {
  /** id de sección (también la clave de tracking) */
  readonly id: string;
  /** etiqueta visible en el navbar de escritorio */
  readonly label: string;
  /** Ruta absoluta de la sección. `inicio` es la raíz canónica (`/`). */
  readonly path: string;
  /** número de orden mostrado en el menú móvil */
  readonly num: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'inicio', label: 'Inicio', path: '/', num: '01' },
  { id: 'proyectos', label: 'Proyectos', path: '/proyectos', num: '02' },
  { id: 'estudio', label: 'Estudio', path: '/estudio', num: '03' },
  { id: 'servicios', label: 'Servicios', path: '/servicios', num: '04' },
  { id: 'contacto', label: 'Contacto', path: '/contacto', num: '05' },
];

/** Datos de contacto y enlaces sociales reutilizables (footer, contacto). */
export const CONTACT = {
  email: 'hola@ateliersolano.studio',
  emailHref: 'mailto:hola@ateliersolano.studio',
  phone: '+34 91 412 78 03',
  phoneHref: 'tel:+34914127803',
  address: ['Calle de Sagasta 34', '28004 Madrid', 'España'],
  instagram: 'https://www.instagram.com/',
  linkedin: 'https://www.linkedin.com/',
  pinterest: 'https://www.pinterest.com/',
} as const;
