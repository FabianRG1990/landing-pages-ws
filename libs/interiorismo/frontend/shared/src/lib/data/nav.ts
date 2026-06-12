/** Ítems de navegación compartidos por el navbar y el menú móvil. */
export interface NavItem {
  /** id de ruta (también el path: /inicio, /proyectos, …) */
  readonly id: string;
  /** etiqueta visible en el navbar de escritorio */
  readonly label: string;
  /** número de orden mostrado en el menú móvil */
  readonly num: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'inicio', label: 'Inicio', num: '01' },
  { id: 'proyectos', label: 'Proyectos', num: '02' },
  { id: 'estudio', label: 'Estudio', num: '03' },
  { id: 'servicios', label: 'Servicios', num: '04' },
  { id: 'contacto', label: 'Contacto', num: '05' },
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
