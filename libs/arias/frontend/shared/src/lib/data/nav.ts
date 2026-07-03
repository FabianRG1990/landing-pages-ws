/** Ítems de navegación compartidos por el navbar y el menú móvil. */
export interface NavItem {
  /** id de sección (también ancla del scroll y key del @for) */
  readonly id: string;
  /** ruta absoluta de la sección. `inicio` es la raíz canónica (`/`) */
  readonly path: string;
  /** etiqueta visible en el navbar de escritorio */
  readonly label: string;
  /** número de orden mostrado en el menú móvil */
  readonly num: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'inicio', path: '/', label: 'Inicio', num: '01' },
  { id: 'sobre', path: '/sobre', label: 'Sobre la Dra.', num: '02' },
  { id: 'servicios', path: '/servicios', label: 'Servicios', num: '03' },
  { id: 'enfoque', path: '/enfoque', label: 'Enfoque', num: '04' },
  { id: 'articulos', path: '/articulos', label: 'Artículos', num: '05' },
  { id: 'contacto', path: '/contacto', label: 'Contacto', num: '06' },
];

/** Número de teléfono / WhatsApp y enlaces de contacto reutilizables. */
export const CONTACT = {
  whatsappHref:
    'https://wa.me/50688379409?text=Hola%20Dra.%20Arias%2C%20me%20gustar%C3%ADa%20agendar%20una%20cita.',
  email: 'monica.ariaslepiz@gmail.com',
  facebook: 'https://www.facebook.com/ariaspsicologia',
  linkedin:
    'https://www.linkedin.com/in/m%C3%B3nica-arias-lepiz-92484999/',
} as const;
