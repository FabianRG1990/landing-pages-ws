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

// Acceso tipado a la API de orientación (el requestPermission de iOS 13+ no está
// en los typings estándar de TS).
type OrientationPermission = 'granted' | 'denied' | 'default';
interface DeviceOrientationEventiOS {
  requestPermission?: () => Promise<OrientationPermission>;
}

/**
 * Inicio — hero cinemático (campo de pétalos, parallax de orbes, tilt 3D) seguido
 * de la prueba social. El tilt 3D responde al CURSOR en escritorio y al
 * GIROSCOPIO en móvil (inclinar el teléfono izq/der ≈ gamma, adelante/atrás ≈
 * beta). En iOS 13+ la orientación exige permiso explícito disparado por un
 * gesto, así que ahí mostramos una píldora "Activar movimiento". Equivale a
 * `<Hero/>` + `<SocialProof/>` del original React.
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
  /** Muestra la píldora para activar el sensor (solo donde hace falta gesto/permiso). */
  protected readonly motionHint = signal(false);

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

  // Estado del tilt suavizado (lerp): objetivo y valor actual, en rango -0.5..0.5.
  private targetNx = 0;
  private targetNy = 0;
  private curNx = 0;
  private curNy = 0;
  private rafId = 0;
  private orientationOn = false;

  constructor() {
    // Intro escalonada: se reproduce cuando la capa que cubría se levanta.
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

      const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      this.zone.runOutsideAngular(() => {
        if (hasFinePointer) {
          this.setupPointerTilt(el);
        } else {
          this.setupMotionTilt();
        }
        this.setupScrollParallax(el);
      });
    });
  }

  /** Escritorio: el cursor mueve el texto/orbes (escritura directa, sin lerp). */
  private setupPointerTilt(el: HTMLElement): void {
    let pending = false;
    let lx = 0;
    let ly = 0;
    const onMove = (e: PointerEvent) => {
      lx = e.clientX;
      ly = e.clientY;
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const nx = (lx - rect.left) / rect.width - 0.5;
        const ny = (ly - rect.top) / rect.height - 0.5;
        this.applyTilt(el, nx, ny);
        pending = false;
      });
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    this.destroyRef.onDestroy(() => el.removeEventListener('pointermove', onMove));
  }

  /**
   * Móvil: el giroscopio mueve el texto/orbes. En iOS 13+ requiere permiso por
   * gesto → mostramos la píldora. En Android se engancha directo; si en 1.6s no
   * llega ningún evento, mostramos la píldora como fallback.
   */
  private setupMotionTilt(): void {
    const supported =
      typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
    if (!supported) return;

    const doe = window.DeviceOrientationEvent as unknown as DeviceOrientationEventiOS;
    const needsPermission = typeof doe.requestPermission === 'function';

    if (needsPermission) {
      // iOS: esperar a que el usuario active (gesto requerido).
      this.zone.run(() => this.motionHint.set(true));
      return;
    }

    // Android / otros: enganchar directo.
    this.attachOrientation();
    let gotEvent = false;
    const probe = () => {
      gotEvent = true;
    };
    window.addEventListener('deviceorientation', probe, { once: true });
    setTimeout(() => {
      window.removeEventListener('deviceorientation', probe);
      if (!gotEvent && !this.orientationOn) {
        this.zone.run(() => this.motionHint.set(true));
      }
    }, 1600);
  }

  /** Handler de la píldora (iOS pide permiso aquí, dentro del gesto del usuario). */
  protected async enableMotion(): Promise<void> {
    const doe = window.DeviceOrientationEvent as unknown as DeviceOrientationEventiOS;
    try {
      if (typeof doe.requestPermission === 'function') {
        const res = await doe.requestPermission();
        if (res !== 'granted') {
          this.motionHint.set(false);
          return;
        }
      }
    } catch {
      // si falla el permiso, ocultar la píldora silenciosamente
    }
    this.motionHint.set(false);
    this.zone.runOutsideAngular(() => this.attachOrientation());
  }

  private attachOrientation(): void {
    if (this.orientationOn) return;
    const el = this.hero().nativeElement;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      this.orientationOn = true;
      // gamma: izquierda-derecha (-90..90). beta: adelante-atrás (~45° en mano).
      this.targetNx = this.clampHalf(e.gamma / 35);
      this.targetNy = this.clampHalf((e.beta - 45) / 35);
      this.startLerp(el);
    };
    window.addEventListener('deviceorientation', onOrient, { passive: true });
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('deviceorientation', onOrient);
      if (this.rafId) cancelAnimationFrame(this.rafId);
    });
  }

  /** Bucle de suavizado (lerp) que interpola hacia el objetivo del sensor. */
  private startLerp(el: HTMLElement): void {
    if (this.rafId) return;
    const step = () => {
      this.curNx += (this.targetNx - this.curNx) * 0.09;
      this.curNy += (this.targetNy - this.curNy) * 0.09;
      this.applyTilt(el, this.curNx, this.curNy);
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  /** Escribe los CSS vars del hero a partir de nx/ny en rango -0.5..0.5. */
  private applyTilt(el: HTMLElement, nx: number, ny: number): void {
    el.style.setProperty('--shift-x', `${nx * 34}px`);
    el.style.setProperty('--shift-y', `${ny * 34}px`);
    el.style.setProperty('--tilt-x', `${ny * -8}deg`);
    el.style.setProperty('--tilt-y', `${nx * 8}deg`);
    el.style.setProperty('--orb1-x', `${nx * 120}px`);
    el.style.setProperty('--orb2-x', `${nx * -120}px`);
  }

  private setupScrollParallax(el: HTMLElement): void {
    let pending = false;
    const onScroll = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 500);
        el.style.setProperty('--orb1-y', `${y * 0.4}px`);
        el.style.setProperty('--orb2-y', `${y * -0.3}px`);
        pending = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
  }

  private clampHalf(v: number): number {
    return Math.max(-1, Math.min(1, v)) * 0.5;
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
