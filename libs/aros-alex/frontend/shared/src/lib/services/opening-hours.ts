import {
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface CrTime {
  readonly day: number;
  readonly mins: number;
}

/**
 * Horario de atención en vivo (hora de Costa Rica, UTC−6 sin DST). Reemplaza el
 * `updateHours()` + setInterval imperativo del sitio original con signals: una
 * señal que tickea cada minuto deriva `isOpen` y `activeDay`; los templates que
 * las leen se actualizan solos. SSR-safe (en el server no tickea).
 */
@Injectable({ providedIn: 'root' })
export class OpeningHours {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly tick = signal(Date.now());

  private readonly cr = computed<CrTime>(() => {
    const ts = this.tick();
    const local = new Date(ts);
    const cr = new Date(ts + local.getTimezoneOffset() * 60000 - 6 * 3600000);
    return { day: cr.getDay(), mins: cr.getHours() * 60 + cr.getMinutes() };
  });

  /** Día activo (0 = domingo) en hora de Costa Rica. */
  readonly activeDay = computed(() => this.cr().day);

  /** `true` si el taller está abierto en este momento. */
  readonly isOpen = computed(() => {
    const { day, mins } = this.cr();
    if (day >= 1 && day <= 5) return mins >= 450 && mins < 1020; // L–V 7:30–17:00
    if (day === 6) return mins >= 480 && mins < 780; // Sáb 8:00–13:00
    return false; // Domingo
  });

  constructor() {
    if (!this.isBrowser) return;
    const id = setInterval(() => this.tick.set(Date.now()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }
}
