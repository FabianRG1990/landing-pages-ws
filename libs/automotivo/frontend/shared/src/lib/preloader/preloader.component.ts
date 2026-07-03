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

/** Preloader tipo escáner de diagnóstico — transcripción fiel del original.
 *  El contador de % va sincronizado al barrido; la salida la maneja la
 *  animación CSS `.amv-preloader` (fade a los 2.55s). */
@Component({
  selector: 'amv-preloader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './preloader.component.html',
  styleUrl: './preloader.component.scss',
})
export class PreloaderComponent implements AfterViewInit, OnDestroy {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly gone = signal(false);

  readonly preloaderStyle = 'position:fixed;inset:0;z-index:2000;background:#0A0A0B;display:flex;flex-direction:column;align-items:center;justify-content:center';

  private readonly pct = viewChild<ElementRef<HTMLSpanElement>>('pct');
  private readonly bar = viewChild<ElementRef<HTMLDivElement>>('bar');
  private raf = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];

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
      else { if (pctEl) pctEl.textContent = '100%'; if (barEl) barEl.style.width = '100%'; }
    };
    this.raf = requestAnimationFrame(step);
    this.timers.push(setTimeout(() => this.gone.set(true), 3300));
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    cancelAnimationFrame(this.raf);
    this.timers.forEach(clearTimeout);
  }
}
