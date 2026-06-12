import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ExperienceReady } from '../preloader/experience-ready.service';

/**
 * ══════════════════════════════════════════════════════════════════
 * CINEMATIC SCROLL ENGINE — secuencia de imágenes (no video)
 * ──────────────────────────────────────────────────────────────────
 *  Reescrito siguiendo el consenso de producción (Codrops/Zajno OPTIKKA,
 *  páginas de producto de Apple) para arreglar los 3 problemas reales del
 *  enfoque anterior (extraer frames de un <video> por seeking):
 *
 *   1. PIXELADO → canvas consciente del devicePixelRatio (backing store en
 *      px de dispositivo) + `imageSmoothingQuality: 'high'`. Antes el canvas
 *      se dimensionaba en px CSS (sin DPR) y los frames se capaban a 1280 →
 *      borroso en pantallas retina/4K.
 *   2. SE VEN LOS CUADROS / SALTOS → 241 frames nativos (antes 150) + un
 *      lerp del índice de frame en el ticker (cada cuadro se acerca suave al
 *      target del scroll). Al parar, converge exacto → sin "pegado" ni rebote.
 *   3. CARGA LENTA → secuencia WebP pre-extraída con FFmpeg (8.3 MB, frames
 *      ~35 KB) en vez de bajar 14 MB de video y hacer 241 seeks en el cliente.
 *      Precarga por etapas: un primer lote se muestra ya; el resto carga en
 *      segundo plano en paralelo.
 *
 *  Layout: CSS sticky (NO position:fixed). Todo browser-only (afterNextRender
 *  / isPlatformBrowser); el prerender solo emite el DOM estático.
 * ══════════════════════════════════════════════════════════════════
 */
const FRAME_COUNT = 241; // frames nativos del video (24fps · 10.04s)
const FIRST_BATCH = 48; // frames a precargar antes de revelar la página
const BG_CONCURRENCY = 6; // descargas en paralelo en segundo plano
const MAX_DPR = 2; // tope de DPR (evita canvases enormes en móviles 3x)

@Component({
  selector: 'app-video-showcase',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './video-showcase.html',
})
export class VideoShowcase {
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly canvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly hint = viewChild.required<ElementRef<HTMLElement>>('hint');
  private readonly label = viewChild.required<ElementRef<HTMLElement>>('label');

  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly experienceReady = inject(ExperienceReady);

  /* estado de animación — campos planos, cero re-renders durante el scroll */
  private readonly frames: (HTMLImageElement | undefined)[] = new Array(
    FRAME_COUNT,
  );
  private ctx: CanvasRenderingContext2D | null = null;
  private st: ScrollTrigger | null = null;
  private tickerFn: (() => void) | null = null;
  private lastProgress = -1; // gate: solo redibujar cuando el scroll cambió
  private lastFrame = 0; // último frame fraccional dibujado (para resize)
  private ready = false;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      gsap.registerPlugin(ScrollTrigger);
      void this.boot();
      this.wireResize();
    });
  }

  /* ── Arranque: precargar primer lote → revelar → cablear → fondo ── */
  private async boot(): Promise<void> {
    const first = Math.min(FIRST_BATCH, FRAME_COUNT);
    await Promise.all(
      Array.from({ length: first }, (_, i) => this.loadFrame(i)),
    );

    this.sizeCanvas();
    this.drawFrame(0);
    this.canvas().nativeElement.classList.add('visible');
    this.ready = true;

    this.setupScroll();
    this.startTicker();

    // Experiencia lista → el preloader puede revelar la página.
    this.experienceReady.markReady();

    // El resto de frames carga en segundo plano, en paralelo.
    this.backgroundLoad(first);
  }

  /* ── Carga de un frame (decodificado fuera del hilo principal) ── */
  private loadFrame(i: number): Promise<void> {
    if (this.frames[i]) return Promise.resolve();
    const img = new Image();
    img.decoding = 'async';
    img.src = this.framePath(i);
    return img
      .decode()
      .then(() => {
        this.frames[i] = img;
      })
      .catch(() => {
        /* frame perdido: el fallback dibuja el más cercano cargado */
      });
  }

  private backgroundLoad(start: number): void {
    let next = start;
    const worker = async (): Promise<void> => {
      while (next < FRAME_COUNT) {
        const i = next++;
        await this.loadFrame(i);
      }
    };
    for (let k = 0; k < BG_CONCURRENCY; k++) void worker();
  }

  private framePath(i: number): string {
    return `showcase/frame_${String(i + 1).padStart(4, '0')}.webp`;
  }

  /* ── Canvas consciente de DPR (backing store en px de dispositivo) ── */
  private sizeCanvas(): void {
    const c = this.canvas().nativeElement;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    c.width = Math.round(cssW * dpr);
    c.height = Math.round(cssH * dpr);
    c.style.width = `${cssW}px`;
    c.style.height = `${cssH}px`;
    this.ctx = c.getContext('2d');
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    }
  }

  /* ── drawFrame(f) — frame FRACCIONAL con crossfade entre adyacentes ──
     En vez de redondear a un frame (que a baja velocidad se ve "tac, tac"),
     dibuja el frame i0 y mezcla encima el i1 con globalAlpha = parte
     fraccional. El resultado es movimiento CONTINUO a cualquier velocidad y,
     al parar, una imagen estable exacta (sin escalones ni rebote). */
  private drawFrame(f: number): void {
    const ctx = this.ctx;
    const c = this.canvas().nativeElement;
    if (!ctx) return;

    const clamped = Math.max(0, Math.min(FRAME_COUNT - 1, f));
    const i0 = Math.floor(clamped);
    const i1 = Math.min(i0 + 1, FRAME_COUNT - 1);
    const t = clamped - i0;

    const base = this.frameAt(i0);
    if (!base) return;

    ctx.clearRect(0, 0, c.width, c.height); // siempre clearRect (sin barras grises)
    ctx.globalAlpha = 1;
    this.drawCover(base);

    // Mezcla del frame siguiente solo si ya cargó y aporta (evita ghosting inútil).
    if (t > 0.01 && i1 !== i0 && this.frames[i1]) {
      ctx.globalAlpha = t;
      this.drawCover(this.frames[i1] as HTMLImageElement);
      ctx.globalAlpha = 1;
    }

    this.lastFrame = clamped;
  }

  /** Dibuja una imagen con object-fit: cover en px de dispositivo. */
  private drawCover(img: HTMLImageElement): void {
    const ctx = this.ctx;
    const c = this.canvas().nativeElement;
    if (!ctx) return;
    const cw = c.width;
    const ch = c.height;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (cw - dw) * 0.5, (ch - dh) * 0.5, dw, dh);
  }

  /** Frame en idx; si aún no cargó, el más cercano ya cargado (sin blanco). */
  private frameAt(idx: number): HTMLImageElement | undefined {
    const i = Math.max(0, Math.min(FRAME_COUNT - 1, idx));
    if (this.frames[i]) return this.frames[i];
    for (let d = 1; d < FRAME_COUNT; d++) {
      if (this.frames[i - d]) return this.frames[i - d];
      if (this.frames[i + d]) return this.frames[i + d];
    }
    return undefined;
  }

  /* ── ScrollTrigger: solo rastrea el progreso (sin scrub) ── */
  private setupScroll(): void {
    this.st = ScrollTrigger.create({
      trigger: this.track().nativeElement,
      start: 'top top',
      end: 'bottom bottom',
    });
    setTimeout(() => ScrollTrigger.refresh(), 150);
  }

  /* ── Ticker: mapeo DIRECTO scroll→frame (Lenis ya suaviza; sin segunda
     capa de easing) + crossfade. Por eso no hay "tac, tac" al frenar. ── */
  private startTicker(): void {
    this.tickerFn = () => {
      const st = this.st;
      if (!st) return;
      const p = st.progress;
      if (Math.abs(p - this.lastProgress) < 0.00002) return; // idle → no redibujar
      this.lastProgress = p;

      this.drawFrame(p * (FRAME_COUNT - 1));

      this.hint().nativeElement.style.opacity = p > 0.04 ? '0' : '1';
      this.label().nativeElement.style.opacity =
        p > 0.08 && p < 0.85 ? '1' : '0';
    };
    gsap.ticker.add(this.tickerFn);
  }

  /* ── Resize: reajustar canvas DPR + redibujar (debounce 150) ── */
  private wireResize(): void {
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!this.ready) return;
        this.sizeCanvas();
        this.drawFrame(this.lastFrame);
        ScrollTrigger.refresh();
      }, 150);
    };
    window.addEventListener('resize', onResize);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timer);
      if (this.tickerFn) gsap.ticker.remove(this.tickerFn);
      this.st?.kill();
    });
  }
}
