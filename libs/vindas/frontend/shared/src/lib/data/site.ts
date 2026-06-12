/** Sección de navegación: `id` es el path de la ruta; `key` indexa el diccionario i18n. */
export interface NavItem {
  readonly id: string;
  readonly key: 'inicio' | 'sobre' | 'servicios' | 'psico' | 'contacto';
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'inicio', key: 'inicio' },
  { id: 'sobre', key: 'sobre' },
  { id: 'servicios', key: 'servicios' },
  { id: 'psicodiagnosticos', key: 'psico' },
  { id: 'contacto', key: 'contacto' },
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
