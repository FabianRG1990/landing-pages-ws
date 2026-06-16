import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IntroGate, RevealDirective } from '@cafe-rosa-ui-shared';

interface Petal {
  readonly size: number;
  readonly left: number;
  readonly top: number;
  readonly duration: number;
  readonly delay: number;
  readonly opacity: number;
  readonly rotation: number;
  readonly drift: number;
}

interface Stat {
  readonly value: string;
  readonly label: string;
}

/**
 * Inicio — hero cinemático (campo de pétalos, parallax de orbes, tilt 3D con el
 * cursor, intro escalonada) seguido de la prueba social (dos marquees infinitos).
 * Equivale a `<Hero/>` + `<SocialProof/>` del original React.
 */
@Component({
  selector: 'app-inicio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class InicioPage {
  protected readonly petals = signal<Petal[]>([]);

  protected readonly stats: readonly Stat[] = [
    { value: '12+', label: 'Orígenes de café' },
    { value: '4.9★', label: 'Valoración media' },
    { value: '50k+', label: 'Clientes felices' },
  ];

  protected readonly press: readonly string[] = [
    'Vogue España', 'Bon Appétit', 'Food & Wine', 'The Guardian', 'Elle Gourmet',
    'Condé Nast', 'National Geographic', 'Time Out Madrid', 'Gastronomy World', "Harper's Bazaar",
  ];

  protected readonly awards: readonly string[] = [
    '☆ Mejor Café 2024', '☆ Guía Michelin', '☆ Top 10 Europa', '☆ Premio Especialidad',
  ];

  private readonly hero = viewChild.required<ElementRef<HTMLElement>>('hero');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly introGate = inject(IntroGate);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  constructor() {
    // Intro escalonada: se reproduce cuando la capa que cubría se levanta
    // (preloader al cargar · cortina al re-entrar) vía IntroGate.
    effect(() => {
      const tick = this.introGate.tick();
      if (!this.isBrowser || tick === 0) return;
      const el = this.hero().nativeElement;
      el.classList.remove('hero-in');
      void el.offsetWidth;
      el.classList.add('hero-in');
    });

    afterNextRender(() => {
      if (!this.isBrowser) return;
      this.petals.set(this.makePetals(60));

      const el = this.hero().nativeElement;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        el.classList.add('hero-in');
        return;
      }

      this.zone.runOutsideAngular(() => {
        // Tilt 3D + desplazamiento del texto siguiendo al cursor.
        let movePending = false;
        let lastX = 0;
        let lastY = 0;
        const onMove = (e: PointerEvent) => {
          lastX = e.clientX;
          lastY = e.clientY;
          if (movePending) return;
          movePending = true;
          requestAnimationFrame(() => {
            const rect = el.getBoundingClientRect();
            const nx = (lastX - rect.left) / rect.width - 0.5;
            const ny = (lastY - rect.top) / rect.height - 0.5;
            el.style.setProperty('--shift-x', `${nx * 30}px`);
            el.style.setProperty('--shift-y', `${ny * 30}px`);
            el.style.setProperty('--tilt-x', `${ny * -8}deg`);
            el.style.setProperty('--tilt-y', `${nx * 8}deg`);
            el.style.setProperty('--orb1-x', `${nx * 120}px`);
            el.style.setProperty('--orb2-x', `${nx * -120}px`);
            movePending = false;
          });
        };

        // Parallax de orbes con el scroll.
        let scrollPending = false;
        const onScroll = () => {
          if (scrollPending) return;
          scrollPending = true;
          requestAnimationFrame(() => {
            const y = window.scrollY;
            el.style.setProperty('--orb1-y', `${Math.min(y, 500) * 0.4}px`);
            el.style.setProperty('--orb2-y', `${Math.min(y, 500) * -0.3}px`);
            scrollPending = false;
          });
        };

        el.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('scroll', onScroll, { passive: true });
        this.destroyRef.onDestroy(() => {
          el.removeEventListener('pointermove', onMove);
          window.removeEventListener('scroll', onScroll);
        });
      });
    });
  }

  private makePetals(n: number): Petal[] {
    const out: Petal[] = [];
    for (let i = 0; i < n; i++) {
      out.push({
        size: Math.random() * 6 + 3,
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: 15 + Math.random() * 25,
        delay: Math.random() * -30,
        opacity: 0.08 + Math.random() * 0.2,
        rotation: Math.random() * 360,
        drift: Math.random() * 20 - 10,
      });
    }
    return out;
  }
}
