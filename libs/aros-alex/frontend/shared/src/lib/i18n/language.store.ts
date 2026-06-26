import {
  Injectable,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Bilingual, Lang } from './types';

const STORAGE_KEY = 'aros-alex.lang';

/**
 * Signal store del idioma activo (ES / EN). Reemplaza el toggle imperativo
 * `data-es`/`data-en` del sitio original: el idioma vive en una signal, se
 * persiste en `localStorage` y se refleja en `<html lang>`. Cualquier template
 * que lea `t()`/`tr()`/`lang()` se re-renderiza solo al cambiar el idioma.
 */
@Injectable({ providedIn: 'root' })
export class LanguageStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _lang = signal<Lang>(this.initialLang());

  /** Idioma activo (solo lectura). */
  readonly lang = this._lang.asReadonly();
  readonly isEnglish = computed(() => this._lang() === 'en');

  constructor() {
    effect(() => {
      const lang = this._lang();
      if (!this.isBrowser) return;
      document.documentElement.lang = lang;
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        /* almacenamiento no disponible — ignorar */
      }
    });
  }

  set(lang: Lang): void {
    this._lang.set(lang);
  }

  toggle(): void {
    this._lang.update((l) => (l === 'es' ? 'en' : 'es'));
  }

  /** Texto del idioma activo de un par bilingüe (lectura reactiva de la signal). */
  readonly t = (value: Bilingual): string => value[this._lang()];

  /** Igual que `t()` pero a partir de dos strings sueltos. */
  readonly tr = (es: string, en: string): string =>
    this._lang() === 'en' ? en : es;

  private initialLang(): Lang {
    if (!this.isBrowser) return 'es';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'es' || stored === 'en') return stored;
    } catch {
      /* ignorar */
    }
    return 'es';
  }
}
