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
 * CINEMATIC SCROLL ENGINE — secuencia de imágenes (241 frames nativos)
 * ──────────────────────────────────────────────────────────────────
 *  El reto resuelto acá es el ATERRIZAJE al frenar el scroll. Con un
 *  mapeo directo scroll→frame, al detenerse el carro queda en un punto
 *  fraccionario y se ven "brincos"/cortes entre cuadros. La solución
 *  (validada por el patrón snap-to-frame de GSAP + crossfade):
 *
 *   1. INERCIA: el índice de frame sigue al scroll con un ease suave
 *      (no salta al valor exacto), así el movimiento tiene un frenado
 *      con "aterrizaje" en vez de cortar en seco.
 *   2. SNAP AL DETENERSE: cuando el scroll queda quieto, el destino se
 *      redondea al frame entero más cercano y el ease aterriza exacto
 *      sobre UN cuadro nítido → sin imagen doble congelada.
 *   3. CROSSFADE EN MOVIMIENTO: mientras se mueve/aterriza, se mezclan
 *      los dos cuadros adyacentes según la fracción, de modo que la
 *      transición es continua (sin "tac, tac") y al asentarse (fracción
 *      → 0) queda perfectamente nítido.
 *
 *  Nitidez: canvas consciente de devicePixelRatio + imageSmoothingQuality
 *  'high'. Carga: WebP pre-extraído, precarga por etapas (primer lote ya,
 *  resto en segundo plano). Todo browser-only.
 * ══════════════════════════════════════════════════════════════════
 */
const FRAME_COUNT = 241; // frames nativos del video (24fps · 10.04s)
// Carpeta de frames. Lleva versión: si alguna vez se regeneran los frames,
// SUBIR esta versión (cinematic2, …) para invalidar el caché `immutable` del
// navegador — si no, sirve frames viejos con el mismo nombre y el video
// "brinca" a tomas equivocadas.
const FRAMES_DIR = 'cinematic';
const FIRST_BATCH = 48; // frames a precargar antes de revelar la página
const BG_CONCURRENCY = 6; // descargas en paralelo en segundo plano
const MAX_DPR = 2; // tope de DPR (evita canvases enormes en móviles 3x)
const EASE = 0.12; // suavidad del aterrizaje (menor = más suave/lento)
const SETTLE_EPS = 0.0015; // umbral para considerar el frame asentado
const IDLE_EPS = 1e-4; // umbral de velocidad de scroll para detectar "quieto"

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

  private targetFrame = 0; // destino (sigue el scroll; redondea al frenar)
  private currentFrame = 0; // posición suavizada con inercia (lo que se dibuja)
  private lastRaw = -1; // frame crudo del scroll en el tick previo (velocidad)
  private lastRendered = -999; // último valor dibujado (evita redibujar igual)
  private lastP = -1; // último progress (para opacidades)
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
    this.render(0);
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
    return `${FRAMES_DIR}/frame_${String(i + 1).padStart(4, '0')}.webp`;
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

  /* ── render(f) — frame fraccional: dibuja el cuadro base y, si la fracción
     aporta, mezcla el siguiente por encima. Al asentarse (fracción ≈ 0 tras
     el snap) queda UN cuadro nítido, sin imagen doble. ── */
  private render(f: number): void {
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

    if (t > 0.012 && i1 !== i0 && this.frames[i1]) {
      ctx.globalAlpha = t;
      this.drawCover(this.frames[i1] as HTMLImageElement);
      ctx.globalAlpha = 1;
    }
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

  /* ── Ticker: inercia + snap-al-frenar. El frenado tiene "aterrizaje". ── */
  private startTicker(): void {
    this.tickerFn = () => {
      const st = this.st;
      if (!st) return;

      const p = st.progress;
      const raw = p * (FRAME_COUNT - 1);

      // ¿Se está moviendo el scroll? Si quedó quieto, redondeamos el destino
      // al frame entero más cercano para aterrizar nítido (sin imagen doble).
      const moving = Math.abs(raw - this.lastRaw) > IDLE_EPS;
      this.lastRaw = raw;
      this.targetFrame = moving ? raw : Math.round(raw);

      // Inercia: el frame se acerca suave al destino (esto es el aterrizaje).
      this.currentFrame += (this.targetFrame - this.currentFrame) * EASE;
      if (Math.abs(this.targetFrame - this.currentFrame) < SETTLE_EPS) {
        this.currentFrame = this.targetFrame;
      }

      // Redibujar solo si el frame cambió de forma perceptible.
      if (Math.abs(this.currentFrame - this.lastRendered) > 0.0008) {
        this.lastRendered = this.currentFrame;
        this.render(this.currentFrame);
      }

      // Opacidades de hint/label (solo cuando el scroll cambió).
      if (Math.abs(p - this.lastP) > 1e-5) {
        this.lastP = p;
        this.hint().nativeElement.style.opacity = p > 0.04 ? '0' : '1';
        this.label().nativeElement.style.opacity =
          p > 0.08 && p < 0.85 ? '1' : '0';
      }
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
        this.lastRendered = -999;
        this.render(this.currentFrame);
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
