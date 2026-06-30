/**
 * Sección de navegación: `id` identifica la sección (también es la clave que
 * resuelve el telón de transición); `path` es el routerLink (inicio en `/`, sin
 * redirección); `key` indexa el diccionario i18n.
 */
export interface NavItem {
  readonly id: string;
  readonly path: string;
  readonly key: 'inicio' | 'sobre' | 'servicios' | 'psico' | 'contacto';
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'inicio', path: '/', key: 'inicio' },
  { id: 'sobre', path: '/sobre', key: 'sobre' },
  { id: 'servicios', path: '/servicios', key: 'servicios' },
  { id: 'psicodiagnosticos', path: '/psicodiagnosticos', key: 'psico' },
  { id: 'contacto', path: '/contacto', key: 'contacto' },
];

/** Datos de contacto (equivalen a las constantes al inicio del script.js original). */
export const PHONE_WA = '50687080637';
export const PHONE_TEL = '+50622600111';
export const PHONE_TEL_DISPLAY = '2260-0111';
export const WHATSAPP_DISPLAY = '8708-0637';
export const EMAIL = ['vale.vindas.salas', 'gmail.com'].join('@');
export const IG_URL = 'https://www.instagram.com/valeriavindas.psicologa';
export const FB_URL = 'https://m.facebook.com/Psicologa-Valeria-Vindas-206571913261217/';

/** URL de WhatsApp con el texto pre-cargado según idioma. */
export function whatsappHref(waText: string): string {
  return 'https://wa.me/' + PHONE_WA + '?text=' + encodeURIComponent(waText);
}
export function mailtoHref(): string {
  return 'mailto:' + EMAIL;
}
