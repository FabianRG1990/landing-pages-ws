import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Icon } from '../../icons/icon';
import { LanguageStore } from '../../i18n/language.store';
import { MapSheet } from '../../services/map-sheet';
import { COPY } from '../../data/copy';

/**
 * Selector de app de mapas — hoja inferior (bottom-sheet) que aparece en el
 * teléfono al tocar la ubicación y deja elegir con qué abrir el mapa: Waze,
 * Google Maps, Apple Maps (solo iOS) o el navegador. Usa *universal links*
 * (https://waze.com/ul, google.com/maps, maps.apple.com): abren la app si está
 * instalada y caen al navegador si no — sin esquemas frágiles (`waze://`).
 *
 * Se renderiza una sola vez en el shell (fuera de `<main>`) y lee su estado del
 * servicio {@link MapSheet}. Honra Escape, click en el backdrop y
 * prefers-reduced-motion, y bloquea el scroll del body mientras está abierta.
 */
@Component({
  selector: 'app-map-chooser',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { '(document:keydown.escape)': 'sheet.close()' },
  template: `
    @if (sheet.open()) {
      <div class="map-sheet" role="dialog" aria-modal="true" [attr.aria-label]="L.t(copy.title)">
        <button type="button" class="map-sheet-backdrop" tabindex="-1"
          [attr.aria-label]="L.t(copy.cancel)" (click)="sheet.close()"></button>

        <div class="map-sheet-panel">
          <div class="map-sheet-head">
            <span class="t">{{ L.t(copy.title) }}</span>
            <span class="h">{{ L.t(copy.hint) }}</span>
          </div>

          <div class="map-sheet-opts">
            <a class="map-opt" [href]="waze()" target="_blank" rel="noopener" (click)="sheet.close()">
              <span class="ic is-waze"><app-icon name="waze" /></span>
              <span class="lbl">Waze</span>
              <app-icon name="arrow" class="go" />
            </a>

            <a class="map-opt" [href]="google()" target="_blank" rel="noopener" (click)="sheet.close()">
              <span class="ic is-google"><app-icon name="googlemaps" /></span>
              <span class="lbl">Google Maps</span>
              <app-icon name="arrow" class="go" />
            </a>

            @if (isIOS()) {
              <a class="map-opt" [href]="apple()" target="_blank" rel="noopener" (click)="sheet.close()">
                <span class="ic is-apple"><app-icon name="apple" /></span>
                <span class="lbl">Apple Maps</span>
                <app-icon name="arrow" class="go" />
              </a>
            }

            <a class="map-opt" [href]="sheet.webUrl()" target="_blank" rel="noopener" (click)="sheet.close()">
              <span class="ic is-web"><app-icon name="globe" /></span>
              <span class="lbl">{{ L.t(copy.browser) }}</span>
              <app-icon name="arrow" class="go" />
            </a>
          </div>

          <button type="button" class="map-sheet-cancel" (click)="sheet.close()">
            {{ L.t(copy.cancel) }}
          </button>
        </div>
      </div>
    }
  `,
})
export class MapChooser {
  protected readonly sheet = inject(MapSheet);
  protected readonly L = inject(LanguageStore);
  protected readonly copy = COPY.contacto.mapChooser;
  protected readonly isIOS = signal(false);

  private readonly q = computed(() => encodeURIComponent(this.sheet.query()));
  protected readonly waze = computed(() => `https://waze.com/ul?q=${this.q()}&navigate=yes`);
  protected readonly google = computed(
    () => `https://www.google.com/maps/search/?api=1&query=${this.q()}`,
  );
  protected readonly apple = computed(() => `https://maps.apple.com/?q=${this.q()}`);

  private readonly doc = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browserReady = signal(false);

  constructor() {
    afterNextRender(() => {
      const nav = this.doc.defaultView?.navigator;
      const ua = nav?.userAgent ?? '';
      this.isIOS.set(
        /iP(hone|od|ad)/.test(ua) || (/Mac/.test(ua) && (nav?.maxTouchPoints ?? 0) > 1),
      );
      this.browserReady.set(true);
    });

    // Bloquea el scroll de fondo mientras la hoja está abierta.
    effect(() => {
      const open = this.sheet.open();
      if (!this.browserReady()) return;
      this.doc.body.style.overflow = open ? 'hidden' : '';
    });

    this.destroyRef.onDestroy(() => {
      if (this.browserReady()) this.doc.body.style.overflow = '';
    });
  }
}
