import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '../../icons/icon';
import { LanguageStore } from '../../i18n/language.store';
import { Review } from '../../data/types';

/**
 * Carrusel de reseñas con scroll lateral infinito y arrastrable (mouse o dedo).
 * Reemplaza el `initMarquee()` imperativo del original, ya componentizado y con
 * signals: avanza solo con un rAF y se puede agarrar para desplazarlo. Las
 * tarjetas se duplican para que el loop no tenga costuras. Honra
 * prefers-reduced-motion (no auto-avanza, pero sigue siendo arrastrable).
 */
@Component({
  selector: 'app-reviews-carousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="rc-viewport">
      <div
        #track
        class="rc-track"
        [class.grabbing]="dragging()"
        [style.transform]="'translateX(' + offset() + 'px)'"
        (pointerdown)="start($event)"
        (pointermove)="move($event)"
        (pointerup)="end($event)"
        (pointercancel)="end($event)"
        (lostpointercapture)="dragging.set(false)"
      >
        @for (r of loop(); track $index) {
          <article class="card review-card">
            <span class="quote-mark">”</span>
            <div class="review-head">
              <span class="stars">★★★★★</span>
              <span class="review-badge"><app-icon name="google" />Google</span>
            </div>
            <p class="quote">{{ L.t(r.quote) }}</p>
            <div class="review-author">
              <span class="av"><app-icon name="fabrication" /></span>
              <span class="who">
                <span class="name">{{ verifiedLabel() }}</span>
                <span class="tag">{{ L.t(r.tag) }}</span>
              </span>
            </div>
          </article>
        }
      </div>
    </div>
  `,
})
export class ReviewsCarousel {
  readonly reviews = input.required<readonly Review[]>();
  readonly verifiedLabel = input('');
  readonly speed = input(0.45);

  protected readonly L = inject(LanguageStore);
  protected readonly offset = signal(0);
  protected readonly dragging = signal(false);

  /** Duplicamos la lista para el loop sin costuras. */
  protected readonly loop = () => [...this.reviews(), ...this.reviews()];

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly destroyRef = inject(DestroyRef);

  private startX = 0;
  private startOffset = 0;

  constructor() {
    afterNextRender(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let raf = 0;
      const tick = (): void => {
        const half = this.track().nativeElement.scrollWidth / 2;
        if (half > 0) {
          let o = this.offset();
          if (!this.dragging() && !reduce) o -= this.speed();
          while (o <= -half) o += half;
          while (o > 0) o -= half;
          this.offset.set(o);
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      this.destroyRef.onDestroy(() => cancelAnimationFrame(raf));
    });
  }

  protected start(e: PointerEvent): void {
    this.dragging.set(true);
    this.startX = e.clientX;
    this.startOffset = this.offset();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }

  protected move(e: PointerEvent): void {
    if (this.dragging()) this.offset.set(this.startOffset + (e.clientX - this.startX));
  }

  protected end(e: PointerEvent): void {
    this.dragging.set(false);
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  }
}
