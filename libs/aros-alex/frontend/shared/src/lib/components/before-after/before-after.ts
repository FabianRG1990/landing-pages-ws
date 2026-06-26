import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';
import { Icon } from '../../icons/icon';

/**
 * Comparador antes / después con un control deslizable. Reemplaza el
 * `initBASliders()` imperativo del original: la posición es una signal y el
 * arrastre se maneja con eventos de puntero declarativos en el template.
 */
@Component({
  selector: 'app-before-after',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div
      class="ba"
      [style.--pos.%]="pos()"
      (pointerdown)="start($event)"
      (pointermove)="move($event)"
      (pointerup)="end($event)"
      (pointercancel)="end($event)"
      (lostpointercapture)="dragging.set(false)"
    >
      <img class="ba-after" [src]="afterImg()" [alt]="afterLabel()" draggable="false" />
      <img class="ba-before" [src]="beforeImg()" [alt]="beforeLabel()" draggable="false" />
      <span class="ba-tag ba-tag--before">{{ beforeLabel() }}</span>
      <span class="ba-tag ba-tag--after">{{ afterLabel() }}</span>
      <div class="ba-divider">
        <span class="ba-handle"><app-icon name="compare" /></span>
      </div>
    </div>
  `,
})
export class BeforeAfter {
  readonly beforeImg = input.required<string>();
  readonly afterImg = input.required<string>();
  readonly beforeLabel = input('Antes');
  readonly afterLabel = input('Después');

  protected readonly pos = signal(50);
  protected readonly dragging = signal(false);

  protected start(e: PointerEvent): void {
    this.dragging.set(true);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    this.setPos(e);
  }

  protected move(e: PointerEvent): void {
    if (this.dragging()) this.setPos(e);
  }

  protected end(e: PointerEvent): void {
    this.dragging.set(false);
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  }

  private setPos(e: PointerEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    this.pos.set(Math.max(4, Math.min(96, pct)));
  }
}
