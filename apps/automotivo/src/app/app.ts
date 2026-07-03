import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  AutomotivoStore,
  PreloaderComponent,
  SceneTransitionComponent,
  SiteNavComponent,
  SiteFooterComponent,
} from '@automotivo-ui-shared';
import { HeroScrollComponent, HomeComponent } from '@automotivo-ui-inicio';
import { ServicesPageComponent } from '@automotivo-ui-servicios';
import { GalleryPageComponent } from '@automotivo-ui-galeria';
import { AboutPageComponent } from '@automotivo-ui-nosotros';
import { ContactPageComponent } from '@automotivo-ui-contacto';

@Component({
  selector: 'amv-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PreloaderComponent,
    SceneTransitionComponent,
    SiteNavComponent,
    SiteFooterComponent,
    HeroScrollComponent,
    HomeComponent,
    ServicesPageComponent,
    GalleryPageComponent,
    AboutPageComponent,
    ContactPageComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly store = inject(AutomotivoStore);
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Observa los `[data-rv]` y les añade `.amv-in` al entrar en viewport. */
  private io?: IntersectionObserver;
  /** Elementos con parallax (`[data-par]`) del segmento visible. */
  private parallax: HTMLElement[] = [];
  private parallaxQueued = false;
  private reduceMotion = false;

  constructor() {
    // Al cambiar de segmento: subir al tope (la cortina cubre el salto) y
    // reescanear reveals/parallax del nuevo contenido tras el render.
    effect(() => {
      this.store.screen();
      if (this.isBrowser) {
        queueMicrotask(() => window.scrollTo({ top: 0, behavior: 'auto' }));
        setTimeout(() => this.scan(), 60);
      }
    });

    if (this.isBrowser) {
      // Refuerzo del gate (por si el <script> inline no corrió).
      this.doc.documentElement.classList.add('amv-anim');
      afterNextRender(() => {
        this.reduceMotion =
          window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        this.io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (e.isIntersecting) {
                e.target.classList.add('amv-in');
                this.io?.unobserve(e.target);
              }
            }
          },
          { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
        );
        window.addEventListener('scroll', this.onScroll, { passive: true });
        window.addEventListener('resize', this.onScroll, { passive: true });
        this.scan();
      });
    }
  }

  /** Registra los reveals/parallax presentes en el DOM actual. */
  private scan(): void {
    const io = this.io;
    if (!io) return;
    const rvs = this.doc.querySelectorAll<HTMLElement>('[data-rv]:not(.amv-in)');
    rvs.forEach((el) => {
      if (this.reduceMotion) {
        el.classList.add('amv-in');
        return;
      }
      io.observe(el);
    });
    this.parallax = Array.from(
      this.doc.querySelectorAll<HTMLElement>('[data-par]'),
    );
    if (!this.reduceMotion) this.applyParallax();
  }

  private readonly onScroll = (): void => {
    if (this.parallaxQueued || this.reduceMotion) return;
    this.parallaxQueued = true;
    requestAnimationFrame(() => {
      this.parallaxQueued = false;
      this.applyParallax();
    });
  };

  /** Desplaza suavemente (±7%) las capas `[data-par]` según su posición. */
  private applyParallax(): void {
    const vh = window.innerHeight || 1;
    for (const el of this.parallax) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue;
      const center = r.top + r.height / 2;
      let shift = (0.5 - center / vh) * 14;
      shift = Math.max(-7, Math.min(7, shift));
      el.style.transform = `translateY(${shift}%)`;
    }
  }
}
