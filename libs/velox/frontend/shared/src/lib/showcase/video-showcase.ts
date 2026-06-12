import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * ══════════════════════════════════════════════════════════════════
 * CINEMATIC SCROLL ENGINE  (traducción Angular del `VideoShowcase` React)
 * ──────────────────────────────────────────────────────────────────
 *  Stack  : ImageBitmap cache → canvas clearRect/drawImage
 *  Motion : GSAP ScrollTrigger scrub:true + deceleración de Lenis (sin
 *           doble lag — ver cinematic-scroll-engine.md §Lenis+scrub)
 *  Layout : CSS sticky (NO position:fixed → sin vacío negro)
 *
 *  Reglas no-negociables aplicadas:
 *   • canvas SIEMPRE transparente; `clearRect` antes de `drawImage`
 *     (nunca `fillRect` → sin barras grises).
 *   • tween de GSAP con `ease:'none'` + `scrub:true` (jamás un número con
 *     Lenis activo) + guard `lastDrawnIdx` → sin rebote N↔N+1 al frenar.
 *   • `ScrollTrigger.refresh()` 150 ms tras montar y tras resize (debounce).
 *
 *  El video es un asset estático del app (`lambo.mp4`); se extraen 150
 *  frames a ImageBitmaps una sola vez tras `canplaythrough`. Todo es
 *  browser-only (guardado por `isPlatformBrowser` / `afterNextRender`),
 *  así el prerender solo emite el DOM estático y la animación se cablea
 *  en el cliente tras hidratar.
 * ══════════════════════════════════════════════════════════════════
 */
const FRAME_COUNT = 150;

@Component({
  selector: 'app-video-showcase',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './video-showcase.html',
})
export class VideoShowcase {
  /** Ruta del asset de video (servido desde apps/velox/public). */
  protected readonly videoSrc = 'lambo.mp4';
  protected readonly frameCount = FRAME_COUNT;
  protected readonly loadMsg = signal('Loading video…');
  protected readonly progressText = signal(`0 / ${FRAME_COUNT}`);

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly canvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly video =
    viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');
  private readonly hint = viewChild.required<ElementRef<HTMLElement>>('hint');
  private readonly label = viewChild.required<ElementRef<HTMLElement>>('label');
  private readonly loading =
    viewChild.required<ElementRef<HTMLElement>>('loading');
  private readonly fill = viewChild.required<ElementRef<HTMLElement>>('fill');
  private readonly frameBadge =
    viewChild.required<ElementRef<HTMLElement>>('frameBadge');

  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  /* estado de animación — campos planos, cero re-renders durante playback */
  private frames: ImageBitmap[] = [];
  private stTween: gsap.core.Tween | null = null;
  private extracting = false;
  private ready = false;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      gsap.registerPlugin(ScrollTrigger);
      this.wireResize();
    });
  }

  /** Dispara la extracción una vez que el video está totalmente bufferizado. */
  protected onCanPlayThrough(): void {
    if (this.extracting) return;
    void this.extractFrames(this.video().nativeElement);
  }

  /* ── draw(idx) — object-fit:cover sobre el canvas; clearRect primero ── */
  private draw(idx: number): void {
    const c = this.canvas().nativeElement;
    const f =
      this.frames[Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(idx)))];
    if (!f) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const cw = c.width;
    const ch = c.height;
    const scale = Math.max(cw / f.width, ch / f.height);
    const dw = f.width * scale;
    const dh = f.height * scale;
    ctx.clearRect(0, 0, cw, ch); // siempre clearRect (sin barras grises)
    ctx.drawImage(f, (cw - dw) * 0.5, (ch - dh) * 0.5, dw, dh);
  }

  /* ── Extracción de 150 ImageBitmaps; progreso vía DOM directo ── */
  private async extractFrames(video: HTMLVideoElement): Promise<void> {
    if (this.extracting) return;
    this.extracting = true;
    this.loadMsg.set('Preparing 150 frames…');

    // canvas de extracción: tope 1280px de ancho, conservar aspecto
    const ew = Math.min(video.videoWidth, 1280);
    const eh = Math.round((ew * video.videoHeight) / video.videoWidth);
    const off = document.createElement('canvas');
    off.width = ew;
    off.height = eh;
    const ctx2 = off.getContext('2d', { willReadFrequently: false });
    if (!ctx2) return;

    const bitmaps: ImageBitmap[] = [];
    for (let i = 0; i < FRAME_COUNT; i++) {
      // distribuir uniformemente sobre toda la duración del video
      video.currentTime = (i / (FRAME_COUNT - 1)) * video.duration;
      await new Promise<void>((r) =>
        video.addEventListener('seeked', () => r(), { once: true }),
      );
      ctx2.drawImage(video, 0, 0, ew, eh);
      bitmaps.push(await createImageBitmap(off));

      const pct = ((i + 1) / FRAME_COUNT) * 100;
      this.fill().nativeElement.style.width = `${pct}%`;
      this.progressText.set(`${i + 1} / ${FRAME_COUNT}`);
    }

    this.frames = bitmaps;

    const c = this.canvas().nativeElement;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    this.draw(0);
    c.classList.add('visible');

    this.ready = true;
    this.loading().nativeElement.classList.add('hidden');

    // esperar un rAF para que el DOM se asiente, luego cablear GSAP
    requestAnimationFrame(() => this.setupScrollAnim());
  }

  /* ── tween de GSAP + ScrollTrigger; una sola vez tras cachear los frames ── */
  private setupScrollAnim(): void {
    const frameProxy = { val: 0 };
    let lastDrawnIdx = -1; // guard anti-rebote en la frontera X.5

    this.stTween = gsap.to(frameProxy, {
      val: FRAME_COUNT - 1,
      ease: 'none', // mapeo lineal scroll → frame
      onUpdate: () => {
        const raw = frameProxy.val;
        const idx = Math.round(raw);

        if (idx !== lastDrawnIdx) {
          lastDrawnIdx = idx;
          this.draw(idx);
        }

        const p = raw / (FRAME_COUNT - 1);
        this.bar().nativeElement.style.width = `${p * 100}%`;
        this.hint().nativeElement.style.opacity = p > 0.04 ? '0' : '1';
        this.label().nativeElement.style.opacity =
          p > 0.08 && p < 0.85 ? '1' : '0';
        this.frameBadge().nativeElement.textContent = `${idx + 1} / ${FRAME_COUNT}`;
      },
      scrollTrigger: {
        trigger: this.track().nativeElement,
        start: 'top top',
        end: 'bottom bottom',
        // scrub:true = mapeo directo a la posición de Lenis. Sin segundo tween
        // de lag — Lenis es dueño de toda la deceleración (anti-rebote).
        scrub: true,
      },
    });

    setTimeout(() => ScrollTrigger.refresh(), 150);
  }

  /* ── Resize: reajustar canvas + redibujar el frame actual (debounce 150) ── */
  private wireResize(): void {
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const c = this.canvas().nativeElement;
        c.width = window.innerWidth;
        c.height = window.innerHeight;
        if (this.ready && this.stTween) {
          const st = this.stTween.scrollTrigger;
          if (st) this.draw(st.progress * (FRAME_COUNT - 1));
        }
        ScrollTrigger.refresh();
      }, 150);
    };
    window.addEventListener('resize', onResize);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timer);
      this.stTween?.scrollTrigger?.kill();
      this.stTween?.kill();
    });
  }
}
