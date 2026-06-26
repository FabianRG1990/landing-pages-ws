import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  HERO_MARQUEE,
  Icon,
  LanguageStore,
  PROMISES,
  REVIEWS,
  RevealDirective,
  COPY,
} from '@aros-alex-ui-shared';

const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));
const rng = (t: number, a: number, b: number): number => clamp((t - a) / (b - a), 0, 1);
const eOut = (x: number): number => 1 - Math.pow(1 - x, 3);
const eInOut = (x: number): number =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

/**
 * 01 · Inicio — hero cinematográfico en tres actos (hero → promesa → reseñas)
 * controlado por scroll. Reemplaza el `runCinema()` imperativo del original:
 * el progreso del scroll vive en signals (`t`, `spin`) actualizadas en un único
 * rAF, y el template deriva cada transform/opacity con `computed` y los aplica
 * con `[style]`. En SSR / prefers-reduced-motion el hero se aplana (`.is-flat`).
 */
@Component({
  selector: 'app-inicio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective, Icon],
  templateUrl: './inicio.html',
})
export class InicioPage {
  protected readonly L = inject(LanguageStore);
  protected readonly copy = COPY;
  protected readonly promises = PROMISES;
  protected readonly reviews = REVIEWS;
  protected readonly marquee = HERO_MARQUEE;

  /** Reseñas duplicadas para que el marquee haga loop sin costuras. */
  protected readonly reviewsLoop = [...REVIEWS, ...REVIEWS];

  /** En modo aplanado mostramos las reseñas una sola vez; en cinema, el loop. */
  protected readonly rowItems = computed(() =>
    this.flat() ? this.reviews : this.reviewsLoop,
  );

  protected readonly flat = signal(true);
  protected readonly headlineIn = signal(false);

  private readonly t = signal(0);
  private readonly spin = signal(0);
  private readonly vw = signal(1280);

  private readonly cinema = viewChild.required<ElementRef<HTMLElement>>('cinema');

  private readonly destroyRef = inject(DestroyRef);

  /** Palabras del título del hero (para la animación de entrada por palabra). */
  protected readonly words = computed(() => this.L.t(this.copy.hero.title).trim().split(/\s+/));

  /** Transforms/opacidades derivadas del progreso de scroll. `null` ⇒ aplanado. */
  protected readonly fx = computed(() => {
    if (this.flat()) return null;
    const t = this.t();
    const vw = this.vw();

    const zp = rng(t, 0.13, 0.3);
    const wx = (1 - eInOut(zp)) * vw * 0.22;
    const wscale = 0.8 + eInOut(zp) * 8.6;
    const wrot = this.spin() + t * 760;
    let wop: number;
    if (t < 0.13) wop = 0.16;
    else if (t < 0.235) wop = 0.16 + rng(t, 0.13, 0.235) * 0.74;
    else wop = 0.9 * (1 - rng(t, 0.235, 0.3));

    const pen = rng(t, 0.26, 0.42);
    const psplit = rng(t, 0.54, 0.7);
    const pvis = Math.min(eOut(pen), 1 - rng(t, 0.64, 0.72));
    const rgrow = rng(t, 0.56, 0.74);

    return {
      heroOpacity: (1 - rng(t, 0.12, 0.24)).toFixed(3),
      heroPointer: 1 - rng(t, 0.12, 0.24) > 0.05 ? 'auto' : 'none',
      contentTransform: `translateY(${(-rng(t, 0, 0.26) * 130).toFixed(1)}px)`,
      cueOpacity: (1 - rng(t, 0, 0.05)).toFixed(3),
      streakTransform: `translateX(${(rng(t, 0, 0.3) * vw * 0.2).toFixed(1)}px) skewX(-12deg)`,
      wheelTransform: `translate(-50%,-50%) translateX(${wx.toFixed(1)}px) rotate(${wrot.toFixed(1)}deg) scale(${wscale.toFixed(3)})`,
      wheelOpacity: clamp(wop, 0, 1).toFixed(3),
      glowOpacity: (0.55 * rng(t, 0.05, 0.16) * (1 - rng(t, 0.235, 0.32))).toFixed(3),
      promOpacity: clamp(pvis, 0, 1).toFixed(3),
      promPointer: pvis > 0.5 ? 'auto' : 'none',
      promInner: `scale(${(1.16 - eOut(pen) * 0.16).toFixed(3)}) translateY(${((1 - eOut(pen)) * 40).toFixed(1)}px)`,
      promHead: `translateY(${(-eInOut(psplit) * 170).toFixed(1)}%)`,
      promHeadOpacity: (1 - psplit).toFixed(3),
      promCards: `translateY(${(eInOut(psplit) * 150).toFixed(1)}%)`,
      promCardsOpacity: (1 - psplit).toFixed(3),
      resenasOpacity: eOut(rgrow).toFixed(3),
      resenasTransform: `scale(${(0.34 + eOut(rgrow) * 0.66).toFixed(3)})`,
      resenasPointer: rgrow > 0.6 ? 'auto' : 'none',
    };
  });

  constructor() {
    afterNextRender(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        this.headlineIn.set(true);
        return;
      }
      this.flat.set(false);
      this.vw.set(window.innerWidth);
      setTimeout(() => this.headlineIn.set(true), 120);

      let raf = 0;
      const loop = () => {
        const el = this.cinema().nativeElement;
        const vh = window.innerHeight || 800;
        const total = el.offsetHeight - vh;
        const top = el.getBoundingClientRect().top;
        this.t.set(total > 0 ? clamp(-top / total, 0, 1) : 0);
        this.spin.update((s) => s + 0.3);
        this.vw.set(window.innerWidth);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      this.destroyRef.onDestroy(() => cancelAnimationFrame(raf));
    });
  }
}
