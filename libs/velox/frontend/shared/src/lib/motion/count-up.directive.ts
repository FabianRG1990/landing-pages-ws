import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';

/**
 * appCountUp — anima un número de 0 al valor objetivo cuando entra en viewport
 * (una sola vez). Para las cifras de performance (850 hp, 2.8 s, …).
 *
 *   <span [appCountUp]="850"></span>
 *   <span [appCountUp]="2.8" [decimals]="1" suffix="s"></span>
 *
 * Honra prefers-reduced-motion (escribe el valor final sin animar).
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly target = input.required<number>({ alias: 'appCountUp' });
  readonly decimals = input(0);
  readonly prefix = input('');
  readonly suffix = input('');
  readonly duration = input(1.8);

  private observer: IntersectionObserver | null = null;
  private done = false;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

      if (reduce) {
        this.write(this.target());
        return;
      }

      this.write(0);
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting && !this.done) {
              this.done = true;
              this.animate();
              this.observer?.disconnect();
            }
          }
        },
        { threshold: 0.4 },
      );
      this.observer.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => this.observer?.disconnect());
    });
  }

  private animate(): void {
    const proxy = { v: 0 };
    gsap.to(proxy, {
      v: this.target(),
      duration: this.duration(),
      ease: 'power2.out',
      onUpdate: () => this.write(proxy.v),
    });
  }

  private write(v: number): void {
    this.host.nativeElement.textContent =
      this.prefix() + v.toFixed(this.decimals()) + this.suffix();
  }
}
