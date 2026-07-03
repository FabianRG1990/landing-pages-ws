import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'amv-preloader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './preloader.component.html',
  styleUrl: './preloader.component.scss',
})
export class PreloaderComponent implements AfterViewInit, OnDestroy {
  /** oculta el nodo del DOM cuando termina la animación de salida */
  readonly gone = signal(false);
  readonly leaving = signal(false);

  private readonly pct = viewChild<ElementRef<HTMLSpanElement>>('pct');
  private readonly bar = viewChild<ElementRef<HTMLDivElement>>('bar');
  private raf = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    // contador de % sincronizado al barrido (~0.35s de retraso, ~1.9s de sweep)
    const start = performance.now() + 350;
    const dur = 1900;
    const step = (t: number) => {
      const p = Math.max(0, Math.min(1, (t - start) / dur));
      const eased = 1 - Math.pow(1 - p, 2);
      const v = Math.round(eased * 100);
      const pctEl = this.pct()?.nativeElement;
      const barEl = this.bar()?.nativeElement;
      if (pctEl) pctEl.textContent = v + '%';
      if (barEl) barEl.style.width = v + '%';
      if (p < 1) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);

    this.timers.push(setTimeout(() => this.leaving.set(true), 2550));
    this.timers.push(setTimeout(() => this.gone.set(true), 3300));
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    this.timers.forEach(clearTimeout);
  }
}
