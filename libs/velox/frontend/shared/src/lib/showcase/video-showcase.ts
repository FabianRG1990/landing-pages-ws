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
// Carpetas de frames CON VERSIÓN: si se regeneran hay que SUBIRLAS para invalidar
// el caché `immutable`. Sets RESPONSIVOS: iOS Safari tiene un límite de memoria de
// imágenes (~384 MB) y NO la libera bien (ni al refrescar) → en móvil usamos un set
// diminuto (640×360, bitmap 0.9 MB/frame) porque la banda del showcase mide ~140px;
// en desktop el set nítido (1280×720, 3.7 MB/frame).
const FRAMES_DIR_DESKTOP = 'cinematic3'; // 1280×720
const FRAMES_DIR_MOBILE = 'cinematic-m'; // 640×360
const FIRST_BATCH = 40; // frames a precargar antes de revelar (primer paint rápido)
const MAX_DPR = 2; // tope de DPR (evita canvases enormes en móviles 3x)
// ── VENTANA DESLIZANTE (clave para iOS Safari) ──
// Mantener los 479 frames decodificados a la vez = ~1.8 GB de bitmaps; iOS Safari
// (~200-400 MB/pestaña) los descarta y RE-DECODIFICA sin parar al hacer scroll →
// jank prolongado ("buggeado hasta que se calienta"). En su lugar solo mantenemos
// decodificada una ventana alrededor del frame actual y liberamos el resto.
const WINDOW = 40; // radio de frames a precargar alrededor del actual
const EVICT = 58; // libera (GC) los frames a más de este radio del actual
const MAX_CONCURRENT = 6; // decodificaciones/descargas simultáneas
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
  private readonly loading = new Set<number>(); // frames en vuelo (anti-duplicado)
  private windowCenter = -999; // último centro de ventana mantenido
  private framesDir = FRAMES_DIR_DESKTOP; // set elegido por dispositivo (constructor)
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
      // Set de frames según dispositivo: en táctiles (iOS Safari, etc.) el set
      // diminuto evita reventar el límite de memoria de imágenes.
      const touch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      this.framesDir = touch ? FRAMES_DIR_MOBILE : FRAMES_DIR_DESKTOP;
      gsap.registerPlugin(ScrollTrigger);
      // En móvil, mostrar/ocultar la barra de URL cambia el alto del viewport y
      // dispara resizes que, al refrescar, REMAPEAN el progreso del track de 700vh
      // → el frame pega un BRINCO. ignoreMobileResize evita ese refresh espurio.
      ScrollTrigger.config({ ignoreMobileResize: true });
      void this.boot();
      this.wireResize();
      // iOS Safari no libera la memoria de imágenes/canvas al refrescar → la
      // siguiente carga arranca cerca del límite y el showcase queda en NEGRO.
      // Liberamos TODO antes de abandonar la página (pagehide = fiable en iOS).
      const onHide = (): void => this.releaseAll();
      window.addEventListener('pagehide', onHide);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('pagehide', onHide);
        this.releaseAll();
      });
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

    // A partir de aquí los frames se cargan/liberan por VENTANA deslizante según
    // el frame actual (lo mantiene el ticker). No se retienen los 479 a la vez.
    this.maintainWindow(0);
  }

  /* ── Carga awaitable de un frame ──
     El frame se valida por el evento `load` (`naturalWidth>0`), NO por `decode()`.
     Safari RECHAZA `img.decode()` para imágenes servidas desde CACHÉ → al
     refrescar (todo cacheado) los frames no se guardaban y el showcase quedaba en
     NEGRO. `decode()` se usa solo como pre-decodificación opcional (acelera el
     primer pintado); si rechaza o se cuelga, `onload` igual valida el frame. */
  private loadFrame(i: number): Promise<void> {
    if (this.frames[i]) return Promise.resolve();
    this.loading.add(i);
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      let settled = false;
      const finish = (): void => {
        if (settled) return;
        if (img.naturalWidth > 0) {
          settled = true;
          this.frames[i] = img;
          this.loading.delete(i);
          resolve();
        }
      };
      const fail = (): void => {
        if (settled) return;
        settled = true;
        this.loading.delete(i);
        resolve();
      };
      img.onload = finish;
      img.onerror = fail;
      img.src = this.framePath(i);
      // Ya en caché: puede estar 'complete' antes de enganchar onload.
      if (img.complete && img.naturalWidth > 0) finish();
      // Pre-decode opcional; su rechazo (Safari + caché) se ignora a propósito.
      else if (img.decode) void img.decode().then(finish).catch(() => undefined);
    });
  }

  /* ── Carga "fire-and-forget" con tope de concurrencia (ventana) ── */
  private requestFrame(i: number): void {
    if (this.frames[i] || this.loading.has(i)) return;
    if (this.loading.size >= MAX_CONCURRENT) return; // se reintenta en el próximo barrido
    void this.loadFrame(i);
  }

  /* ── Mantiene decodificada SOLO una ventana alrededor de `center`:
     carga los cercanos (de dentro hacia fuera) y LIBERA los lejanos. ── */
  private maintainWindow(center: number): void {
    this.windowCenter = center;
    const max = FRAME_COUNT - 1;
    // Liberar lo que esté fuera del radio EVICT.
    for (let i = 0; i <= max; i++) {
      if (this.frames[i] && Math.abs(i - center) > EVICT) this.release(i);
    }
    // Cargar la ventana de dentro hacia fuera (prioriza los más cercanos).
    for (let off = 0; off <= WINDOW; off++) {
      const a = center + off;
      const b = center - off;
      if (a <= max) this.requestFrame(a);
      if (b >= 0) this.requestFrame(b);
    }
  }

  /* ── Libera un frame DE VERDAD ──
     En iOS Safari el GC NO libera la memoria de una imagen al soltar la
     referencia; hay que vaciar su `src` explícitamente (documentado). Sin esto la
     ventana no reducía nada y se acumulaba hasta el límite → jank / negro. */
  private release(i: number): void {
    const img = this.frames[i];
    if (!img) return;
    img.onload = null;
    img.onerror = null;
    img.src = '';
    this.frames[i] = undefined;
  }

  /* ── Libera TODO (frames + canvas) — al destruir y antes de refrescar ──
     Encoger el canvas a 1×1 fuerza a Safari a soltar su buffer (PQINA). */
  private releaseAll(): void {
    for (let i = 0; i < FRAME_COUNT; i++) this.release(i);
    this.loading.clear();
    try {
      const c = this.canvas().nativeElement;
      c.width = 1;
      c.height = 1;
      this.ctx?.clearRect(0, 0, 1, 1);
    } catch {
      /* la vista ya está destruida — nada que encoger */
    }
  }

  private framePath(i: number): string {
    return `${this.framesDir}/frame_${String(i + 1).padStart(4, '0')}.webp`;
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

  /** Dibuja una imagen encajada en px de dispositivo.
   *  `alpha < 1` la funde sobre lo ya dibujado (mezcla sub-frame).
   *
   *  Encaje adaptativo según orientación:
   *  • HORIZONTAL/DESKTOP → `cover`: la pantalla ya es ~16:9, llena sin recorte
   *    perceptible.
   *  • VERTICAL (teléfono) → recorte de FUENTE a la banda del coche + ajuste a lo
   *    ANCHO con zoom leve. Los frames (1920×1080) tienen muchísimo espacio MUERTO
   *    vertical (techo del estudio arriba, suelo abajo) y el coche es un sujeto
   *    ANCHO que ocupa casi todo el frame en una banda media. Con `cover` se
   *    recortaría el coche a una franja central (~26%, irreconocible); con
   *    `contain` el coche queda diminuto y perdido entre el estudio oscuro. La
   *    solución correcta (verificada con la propia secuencia): muestrear solo la
   *    banda del coche (sy 0.30–0.86) y ajustarla al ancho → el coche se ve
   *    ENTERO y grande, centrado en banda cinematográfica. El ZOOM recorta solo
   *    las puntas (parachoques), nunca el cuerpo. Las franjas letterbox quedan en
   *    el oscuro del tema; los overlays/viñeta se desactivan en vertical por CSS
   *    (calibrados para pantalla completa, ahí oscurecían y "se tragaban" el
   *    coche de la banda). */
  private draw(img: HTMLImageElement, alpha: number): void {
    const ctx = this.ctx;
    const c = this.canvas().nativeElement;
    if (!ctx) return;
    const cw = c.width;
    const ch = c.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    if (ch > cw) {
      // VERTICAL: recorte de fuente a la banda del coche + ajuste a lo ancho.
      const ZOOM = 1.15; // leve; mantiene el coche ENTERO (sin recortar puntas)
      const sx = 0;
      const sw = iw;
      const sy = ih * 0.3;
      const sh = ih * 0.56;
      const scale = (cw / sw) * ZOOM;
      const dw = sw * scale;
      const dh = sh * scale;
      const dx = (cw - dw) * 0.5;
      const dy = (ch - dh) * 0.5;
      if (alpha === 1) {
        // Pinta el oscuro del tema bajo la banda (letterbox sin píxeles rancios).
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(0, 0, cw, ch);
      }
      if (alpha < 1) ctx.globalAlpha = alpha;
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
      if (alpha < 1) ctx.globalAlpha = 1;
      return;
    }

    // HORIZONTAL/DESKTOP: cover.
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
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

      // Mantén la ventana de frames decodificados centrada en el actual (y libera
      // los lejanos). Solo cuando el centro se ha desplazado lo suficiente, para no
      // barrer en cada tick. Crítico para que iOS no acumule/re-decodifique todo.
      const ci = Math.round(f);
      if (Math.abs(ci - this.windowCenter) >= 5) this.maintainWindow(ci);

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

  /* ── Resize: reajustar canvas DPR + redibujar (debounce 150).
     SOLO reacciona a cambios de ANCHO (rotación / resize real). En móvil, la barra
     de URL cambia el ALTO al hacer scroll y dispara resizes constantes; refrescar
     ahí remapea el progreso del track y produce el BRINCO del frame → se ignoran. ── */
  private wireResize(): void {
    let timer: ReturnType<typeof setTimeout>;
    let lastW = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === lastW) return; // cambio solo de alto (barra URL) → ignorar
      lastW = window.innerWidth;
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
