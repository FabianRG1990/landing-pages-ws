import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PageTransition } from './page-transition.service';

/**
 * Telón de transición entre segmentos: dos paneles (arriba/abajo) que cierran
 * como un obturador/letterbox hasta una costura dorada al centro, y luego
 * abren. La coreografía SINCRONIZADA la maneja `PageTransition` (cubre → navega
 * → revela). Este componente solo aporta el DOM y lo registra en el servicio.
 */
@Component({
  selector: 'app-route-curtain',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="route-curtain" aria-hidden="true">
    <div class="curtain-panel curtain-panel--top" #top></div>
    <div class="curtain-panel curtain-panel--bottom" #bottom></div>
    <div class="curtain-seam" #seam></div>
  </div>`,
})
export class RouteCurtain {
  private readonly top = viewChild.required<ElementRef<HTMLElement>>('top');
  private readonly bottom =
    viewChild.required<ElementRef<HTMLElement>>('bottom');
  private readonly seam = viewChild.required<ElementRef<HTMLElement>>('seam');

  private readonly transition = inject(PageTransition);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      this.transition.register(
        this.top().nativeElement,
        this.bottom().nativeElement,
        this.seam().nativeElement,
      );
    });
  }
}
