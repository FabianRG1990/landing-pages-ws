import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { PageTransition } from '../../transitions/page-transition.service';

interface Slat {
  readonly left: number;
  readonly width: number;
  readonly i: number;
  readonly background: string;
}

const TONES = [
  'linear-gradient(180deg,#B85C45 0%, #9C4D38 100%)',
  'linear-gradient(180deg,#C76B50 0%, #AC5740 100%)',
  'linear-gradient(180deg,#D67C5E 0%, #BC6750 100%)',
  'linear-gradient(180deg,#E08A6C 0%, #C9745C 100%)',
  'linear-gradient(180deg,#D67C5E 0%, #BC6750 100%)',
  'linear-gradient(180deg,#C76B50 0%, #AC5740 100%)',
  'linear-gradient(180deg,#B85C45 0%, #9C4D38 100%)',
];

/**
 * Telón cinematográfico de transición entre secciones (7 láminas escalonadas +
 * emblema que florece + nombre de la sección). Solo renderiza el DOM y lo
 * registra en `PageTransition`, que orquesta la animación sincronizada con el
 * router. Respeta prefers-reduced-motion (el servicio omite la animación).
 */
@Component({
  selector: 'app-veil',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #curtain class="curtain" aria-hidden="true">
      @for (s of slats; track s.i) {
        <div
          class="curtain__slat"
          [style.left.%]="s.left"
          [style.width.%]="s.width"
          [style.background]="s.background"
          [style.--i]="s.i"
          [style.--n]="slats.length"
        ></div>
      }
      <div class="curtain__sheen"></div>
      <div class="curtain__bloom"></div>
      <div class="curtain__content">
        <div class="curtain__emblem">
          <div class="curtain__ring curtain__ring--1"></div>
          <div class="curtain__ring curtain__ring--2"></div>
          <div class="curtain__frame"></div>
          <img class="curtain__mark" src="assets/logo-mark-white.png" alt="" />
        </div>
        <div #label class="curtain__label"></div>
        <div class="curtain__line"></div>
        <div #sub class="curtain__sub"></div>
      </div>
    </div>
  `,
})
export class Veil {
  protected readonly slats: Slat[] = TONES.map((background, i) => ({
    left: (i * 100) / TONES.length,
    width: 100 / TONES.length + 0.5,
    i,
    background,
  }));

  private readonly curtain = viewChild.required<ElementRef<HTMLElement>>('curtain');
  private readonly label = viewChild.required<ElementRef<HTMLElement>>('label');
  private readonly sub = viewChild.required<ElementRef<HTMLElement>>('sub');
  private readonly transition = inject(PageTransition);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      this.transition.register(
        this.curtain().nativeElement,
        this.label().nativeElement,
        this.sub().nativeElement,
      );
    });
    this.destroyRef.onDestroy(() => this.transition.unregister());
  }
}
