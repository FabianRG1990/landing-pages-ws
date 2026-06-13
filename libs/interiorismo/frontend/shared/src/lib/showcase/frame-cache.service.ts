import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Caché compartido de los frames de la vista que se despliega (canvas
 * scroll-driven). Decodifica las 121 imágenes UNA sola vez y las conserva como
 * singleton (`providedIn: 'root'`), de modo que al navegar fuera de `inicio` y
 * volver no se vuelvan a crear ni re-decodificar 121 `Image` (lo que antes
 * competía con el video del hero y dejaba la sección "trabada").
 *
 * Segunda visita = imágenes ya `complete` → el canvas dibuja al instante.
 */
@Injectable({ providedIn: 'root' })
export class FrameCache {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly count = 121;
  private readonly path = (i: number) =>
    `/frames/frame_${String(i).padStart(3, '0')}.jpg`;

  private frames: HTMLImageElement[] | null = null;

  /**
   * Arranca (o reutiliza) la pre-carga eager de los 121 frames y devuelve el
   * arreglo de `HTMLImageElement`. Idempotente: solo descarga la primera vez.
   */
  preload(): HTMLImageElement[] {
    if (!this.isBrowser) return [];
    if (this.frames) return this.frames;

    const frames = new Array<HTMLImageElement>(this.count);
    for (let i = 0; i < this.count; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = this.path(i + 1);
      frames[i] = img;
    }
    this.frames = frames;
    return frames;
  }

  /** Frames ya cacheados (o null si aún no se llamó a preload). */
  get(): HTMLImageElement[] | null {
    return this.frames;
  }
}
