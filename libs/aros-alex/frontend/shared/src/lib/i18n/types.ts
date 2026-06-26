/** Idiomas soportados por el sitio. */
export type Lang = 'es' | 'en';

/** Un texto con su versión en español e inglés. */
export interface Bilingual {
  readonly es: string;
  readonly en: string;
}
