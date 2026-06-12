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
 * CINEMATIC SCROLL ENGINE — secuencia de imágenes (estándar Apple/Awwwards)
 * ──────────────────────────────────────────────────────────────────
 *  Patrón canónico (skill scroll-animation + Apple Mac Pro): preload de todos
 *  los frames y, en cada tick, INTERPOLACIÓN SUB-FRAME — se dibuja el frame N
 *  más el adyacente N+1 con opacidad = la parte fraccionaria del progreso. Así
 *  la imagen es una función CONTINUA del scroll (no escalonada): en el
 *  "aterrizaje", cuando Lenis desacelera a casi cero, se funde suavemente entre
 *  cuadros en vez de "clavar" cada frame entero (los 3-4 brincos al frenar).
 *  Al detenerse por completo se cristaliza al frame más cercano → queda nítido.
 *
 *  ¿Por qué esto no es el crossfade que falló antes? Aquel fundía cuadros
 *  LEJANOS por el lag de inercia → "tomas montadas". Aquí solo se mezclan
 *  VECINOS inmediatos (479 frames densos) → se lee como desenfoque de
 *  movimiento natural, nunca como fantasma. Sin inercia propia: el frame sigue
 *  a Lenis 1:1.
 *
 *  Claves de fluidez/calidad:
 *   • 479 frames (24→48fps interpolados con optical-flow, verificados sin
 *     discontinuidad) → vecinos muy cercanos = la mezcla es micro motion-blur.
 *   • mezcla sub-frame continua mientras hay movimiento; snap nítido en reposo.
 *   • canvas consciente de DPR + object-fit cover + imageSmoothingQuality high
 *     → nítido en retina/4K.
 *   • getContext('2d', { alpha:false }) → opaco = más rápido.
 *   • fallback al frame cargado más cercano → nunca queda en blanco.
 *
 *  Carga: WebP pre-extraído, precarga por etapas (primer lote → revelar, resto
 *  en segundo plano en paralelo). Todo browser-only.
 * ══════════════════════════════════════════════════════════════════
 */
const FRAME_COUNT = 479; // 24→48fps optical-flow (de 241 nativos)
// Carpeta de frames CON VERSIÓN: si se regeneran los frames hay que SUBIRLA
// (cinematic3, …) para invalidar el caché `immutable` del navegador.
const FRAMES_DIR = 'cinematic2';
const FIRST_BATCH = 80; // frames a precargar antes de revelar la página
const BG_CONCURRENCY = 6; // descargas en paralelo en segundo plano
const MAX_DPR = 2; // tope de DPR (evita canvases enormes en móviles 3x)
// Reposo CON HISTÉRESIS — evita el "toggle" snap/blend que producía 3-4 brincos
// al frenar. Solo cristalizamos cuando la quietud es SOSTENIDA, y el aterrizaje
// final es un micro-ease del frac (no un salto), para que no haya ningún pop.
const REST_WINDOW = 0.03; // deriva (en frames) tolerada como "quieto"
const STILL_TICKS = 6; // ticks seguidos casi inmóvil antes de aterrizar (~100ms)
const SETTLE_EASE = 0.2; // suavidad del micro-aterrizaje hacia el frame nítido

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
  private currentIdx = -1; // último frame base realmente dibujado
  private lastF = 0; // último frame (float) — para redibujar en resize
  private lastP = -1; // último progress (para opacidades)
  /* máquina de reposo con histéresis */
  private restRef = -999; // referencia para medir deriva desde el último reposo
  private stillCount = 0; // ticks seguidos dentro de la ventana de reposo
  private settling = false; // micro-aterrizaje en curso
  private settleBase = 0; // frame base del aterrizaje
  private settleFrac = 0; // frac animándose hacia settleTarget
  private settleTarget = 0; // 0 → asienta en base; 1 → asienta en base+1
  private settled = false; // ya cristalizado y quieto
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
    this.renderFloat(0);
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
    this.ctx = c.getContext('2d', { alpha: false }); // opaco = más rápido
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    }
  }

  /* ── renderFloat(f) — interpolación sub-frame. Dibuja el frame base (floor)
     y, encima, el adyacente N+1 con opacidad = parte fraccionaria → la imagen
     es CONTINUA respecto al scroll (sin escalones). Si el base no cargó, usa el
     más cercano ya cargado (nunca queda en blanco); el adyacente solo se mezcla
     si ya está cargado (es una mejora, no un requisito). ── */
  private renderFloat(f: number): void {
    const max = FRAME_COUNT - 1;
    const clamped = Math.max(0, Math.min(max, f));
    const base = Math.floor(clamped);
    this.drawFrame(base, clamped - base);
  }

  /** Dibuja el frame `base` + el vecino `base+1` con opacidad `frac`. */
  private drawFrame(base: number, frac: number): void {
    const max = FRAME_COUNT - 1;
    const b = Math.max(0, Math.min(max, base));
    const baseImg = this.frames[b] ?? this.nearestLoaded(b);
    if (!baseImg) return;
    this.draw(baseImg, 1);

    // Mezcla sub-frame SOLO entre vecinos inmediatos (micro motion-blur).
    if (frac > 0.001 && b < max) {
      const nextImg = this.frames[b + 1];
      if (nextImg) this.draw(nextImg, frac);
    }
    this.currentIdx = b;
  }

  /** Busca el frame cargado más cercano a `want` (fallback anti-blanco). */
  private nearestLoaded(want: number): HTMLImageElement | undefined {
    for (let off = 1; off < FRAME_COUNT; off++) {
      const a = this.frames[want - off];
      if (a) return a;
      const b = this.frames[want + off];
      if (b) return b;
    }
    return undefined;
  }

  /** Dibuja una imagen con object-fit: cover en px de dispositivo.
   *  `alpha < 1` la funde sobre lo ya dibujado (mezcla sub-frame). */
  private draw(img: HTMLImageElement, alpha: number): void {
    const ctx = this.ctx;
    const c = this.canvas().nativeElement;
    if (!ctx) return;
    const cw = c.width;
    const ch = c.height;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    if (alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(img, (cw - dw) * 0.5, (ch - dh) * 0.5, dw, dh);
    if (alpha < 1) ctx.globalAlpha = 1;
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

  /* ── Ticker: scroll→frame (float) con reposo por histéresis.
     • Movimiento real → mezcla sub-frame continua (Lenis da el aterrizaje).
     • Quietud SOSTENIDA (STILL_TICKS) → micro-ease del frac al frame entero
       más cercano = se asienta nítido SIN salto (mata los 3-4 brincos). ── */
  private startTicker(): void {
    const max = FRAME_COUNT - 1;
    this.tickerFn = () => {
      const st = this.st;
      if (!st) return;
      const p = st.progress;
      const f = Math.max(0, Math.min(max, p * max));
      this.lastF = f;

      if (Math.abs(f - this.restRef) > REST_WINDOW) {
        // ── Movimiento real → mezcla continua; reinicia el reposo. ──
        this.restRef = f;
        this.stillCount = 0;
        this.settling = false;
        this.settled = false;
        this.renderFloat(f);
      } else if (this.settled) {
        // ya nítido y quieto → nada que redibujar
      } else if (this.settling) {
        // ── Micro-aterrizaje: el frac se asienta en 0 o 1 (sin pop). ──
        this.settleFrac += (this.settleTarget - this.settleFrac) * SETTLE_EASE;
        if (Math.abs(this.settleFrac - this.settleTarget) < 0.01) {
          this.settling = false;
          this.settled = true;
          this.drawFrame(this.settleBase + this.settleTarget, 0);
        } else {
          this.drawFrame(this.settleBase, this.settleFrac);
        }
      } else {
        // ── Dentro de la ventana de reposo: confirmar quietud sostenida. ──
        this.stillCount++;
        if (this.stillCount >= STILL_TICKS) {
          const base = Math.floor(f);
          if (base >= max) {
            this.settled = true;
            this.drawFrame(max, 0);
          } else {
            this.settleBase = base;
            this.settleFrac = f - base;
            this.settleTarget = this.settleFrac < 0.5 ? 0 : 1;
            this.settling = true;
          }
        } else {
          this.renderFloat(f);
        }
      }

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
        this.settled = false; // forzar redibujo tras el resize
        this.settling = false;
        this.restRef = -999; // se tratará como movimiento → redibuja la mezcla
        this.renderFloat(this.lastF);
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
