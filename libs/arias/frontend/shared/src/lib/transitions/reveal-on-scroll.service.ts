import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Revela elementos al entrar en viewport mediante un único IntersectionObserver
 * compartido. Cuando varios elementos entran a la vez (scroll rápido) se ordenan
 * por posición en el DOM y se les asigna un stagger pequeño y acotado, de modo
 * que la cascada se vea limpia y ordenada tanto en scroll lento como rápido
 * (en vez del desorden que produce un delay fijo por elemento).
 */
@Injectable({ providedIn: 'root' })
export class RevealOnScroll {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private observer: IntersectionObserver | null = null;
  private reduce = false;

  private readonly stepMs = 40; // separación entre elementos de un mismo grupo
  private readonly maxDelayMs = 280; // tope del stagger por grupo

  private ensure(): void {
    if (this.observer || !this.isBrowser) return;
    this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          // Stagger = posición del elemento entre sus hermanos `reveal` (su
          // grupo visual). Es independiente del tiempo y del lote del observer,
          // así una grilla siempre cae en cascada 0, step, 2·step, … sin
          // importar si el scroll es lento o rápido.
          el.style.setProperty('--reveal-delay', `${this.groupDelay(el)}ms`);
          el.classList.add('is-visible');
          this.observer?.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -5% 0px' },
    );
  }

  private groupDelay(el: HTMLElement): number {
    const parent = el.parentElement;
    if (!parent) return 0;
    const siblings = Array.from(parent.children).filter((c) =>
      c.classList.contains('reveal'),
    );
    const idx = Math.max(0, siblings.indexOf(el));
    return Math.min(idx * this.stepMs, this.maxDelayMs);
  }

  observe(el: HTMLElement): void {
    if (!this.isBrowser) return;
    this.ensure();
    if (this.reduce) {
      el.classList.add('is-visible');
      return;
    }
    this.observer?.observe(el);
  }

  unobserve(el: HTMLElement): void {
    this.observer?.unobserve(el);
  }
}
