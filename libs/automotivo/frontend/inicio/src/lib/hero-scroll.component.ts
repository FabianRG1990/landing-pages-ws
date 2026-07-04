import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AutomotivoStore } from '@automotivo-ui-shared';

/**
 * HERO de la pantalla "inicio" — transcripción fiel del artefacto original:
 * stage fijo de 460vh con el video (144 cuadros) escrito a un canvas
 * full-bleed y escrubeado por scroll, texto que se desliza y desvanece, y
 * el panel "Acerca" que emerge desde atrás dentro del mismo stage.
 * La lógica es un port directo de `updateVideo`/`tickSeq`/`drawFrame` del
 * runtime (support.js) del original.
 */
const N = 144;

@Component({
  selector: 'amv-hero-scroll',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero-scroll.component.html',
  styleUrl: './hero-scroll.component.scss',
})
export class HeroScrollComponent implements AfterViewInit, OnDestroy {
  private readonly store = inject(AutomotivoStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly sectionRef = viewChild.required<ElementRef<HTMLElement>>('section');
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly textRef = viewChild.required<ElementRef<HTMLElement>>('text');
  private readonly hintRef = viewChild.required<ElementRef<HTMLElement>>('hint');
  private readonly aboutRef = viewChild.required<ElementRef<HTMLElement>>('about');
  private readonly vigRef = viewChild.required<ElementRef<HTMLElement>>('vig');
  private readonly mediaRef = viewChild.required<ElementRef<HTMLElement>>('mediawrap');

  readonly aboutStats = [
    { t: 'Honestidad', d: 'Te decimos lo que necesita —y lo que no.' },
    { t: 'Mecánica + Transporte', d: 'Taller físico y traslado en plataforma.' },
    { t: 'Atención directa', d: 'Hablás con quien repara tu carro.' },
    { t: 'Heredia', d: 'Santo Domingo · San Miguel' },
  ];

  private imgs: HTMLImageElement[] = [];
  private ctx: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private targetF = 0;
  private lastF = 0;
  private restRef = -999;
  private stillCount = 0;
  private settled = false;
  private frameW = 0;
  private frameH = 0;
  private fitP = 0; // 0 = cover (full-bleed); 1 = logo encuadrado (zoom negativo)
  private seqReady = false;
  private ticking = false;
  private vloop = 0;
  private readonly onScroll = () => {
    if (!this.ticking) {
      this.ticking = true;
      requestAnimationFrame(() => this.upd());
    }
  };

  constructor() {
    // Al volver a "inicio", reiniciamos el hero al primer cuadro.
    effect(() => {
      if (this.store.screen() === 'inicio' && this.isBrowser && this.seqReady) {
        queueMicrotask(() => this.resetHero());
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.preloadFrames();
    const loop = () => {
      this.tickSeq();
      this.vloop = requestAnimationFrame(loop);
    };
    this.vloop = requestAnimationFrame(loop);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    requestAnimationFrame(() => this.upd());
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    cancelAnimationFrame(this.vloop);
    window.removeEventListener('scroll', this.onScroll);
  }

  goContacto(): void { this.store.go('contacto'); }
  goNosotros(): void { this.store.go('nosotros'); }

  // ---- scroll → coreografía (port de updateVideo) ----
  private upd(): void {
    this.ticking = false;
    const section = this.sectionRef().nativeElement;
    const text = this.textRef().nativeElement;
    const hint = this.hintRef().nativeElement;
    const about = this.aboutRef().nativeElement;
    const vig = this.vigRef().nativeElement;
    const mediaw = this.mediaRef().nativeElement;

    const total = Math.max(1, section.offsetHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / total));
    const q = (a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
    const eio = (t: number) => t * t * (3 - 2 * t);

    // 1) cuadro objetivo en p[0.05 .. 0.72]
    this.targetF = q(0.05, 0.72);
    // 1b) Zoom negativo SINCRONIZADO con el contenido del video (no con el
    //     scroll): arranca cuando empiezan a dibujarse las letras del logo
    //     (~cuadro 64/143 ≈ 0.45 de la secuencia) y termina antes del último
    //     cuadro (~0.92), para que "automotivo" —cuadro muy panorámico
    //     (2.33:1)— quede completo y centrado justo cuando el video calza el
    //     final. Atado a targetF (el cuadro real) para que el alejamiento
    //     acompañe exactamente a las letras. El encuadre se calcula en draw();
    //     aquí animamos el progreso y forzamos redibujo (por si ya se asentó).
    const fl = Math.min(1, Math.max(0, (this.targetF - 0.45) / (0.92 - 0.45)));
    const fitTarget = eio(fl);
    if (Math.abs(fitTarget - this.fitP) > 0.0005) {
      this.fitP = fitTarget;
      this.settled = false;
      this.restRef = -999;
      this.renderFloat(this.lastF);
    }
    // 2) el texto se desliza al costado + se desvanece en p[0 .. 0.17].
    //    En reposo (e1≈0) NO promovemos la capa ni aplicamos transform: así el
    //    H1 se rasteriza nítido (evita el blur de will-change en DPR fraccional
    //    de Windows). Solo promovemos mientras hay movimiento real.
    const e1 = eio(q(0, 0.17));
    if (e1 <= 0.0001) {
      text.style.transform = 'none';
      text.style.willChange = 'auto';
    } else {
      text.style.willChange = 'transform, opacity';
      text.style.transform = 'translateX(' + (-e1 * 190).toFixed(1) + 'px)';
    }
    text.style.opacity = (1 - e1).toFixed(3);
    text.style.pointerEvents = e1 > 0.4 ? 'none' : '';
    hint.style.opacity = (1 - q(0, 0.1)).toFixed(3);
    // 3) el media recede con zoom negativo, perdiéndose en el fondo oscuro
    const r = eio(q(0.7, 0.92));
    mediaw.style.transformOrigin = '50% 50%';
    mediaw.style.transform = 'scale(' + (1 - 0.34 * r).toFixed(3) + ')';
    mediaw.style.opacity = (1 - r).toFixed(3);
    mediaw.style.filter = 'blur(' + (r * 6).toFixed(1) + 'px) brightness(' + (1 - r * 0.7).toFixed(3) + ')';
    mediaw.style.borderRadius = (r * 26).toFixed(0) + 'px';
    // 4) "Acerca" emerge desde atrás, pantalla fija, y se asienta
    const e2 = eio(q(0.64, 0.98));
    vig.style.opacity = (1 - e2).toFixed(3);
    if (e2 >= 0.999) {
      about.style.transform = 'none';
      about.style.filter = 'none';
      about.style.willChange = 'auto';
      about.style.opacity = '1';
    } else {
      about.style.transformOrigin = '50% 50%';
      about.style.transform = 'scale(' + (0.55 + 0.45 * e2).toFixed(3) + ')';
      about.style.opacity = e2.toFixed(3);
      about.style.filter = 'blur(' + ((1 - e2) * 9).toFixed(1) + 'px)';
      about.style.willChange = 'transform, opacity';
    }
    about.style.pointerEvents = e2 > 0.92 ? 'auto' : 'none';
  }

  // ---- carga de cuadros ----
  private preloadFrames(): void {
    this.imgs = new Array(N);
    let loaded = 0;
    const done = () => {
      if (this.seqReady) return;
      this.seqReady = true;
      this.restRef = -999;
      this.renderFloat(this.lastF || 0);
    };
    const cap = setTimeout(done, 12000);
    const load = (i: number, priority: 'high' | 'low') => {
      const im = new Image();
      im.decoding = 'async';
      im.setAttribute('fetchpriority', priority);
      im.onload = im.onerror = () => {
        loaded++;
        if (i === 0 && im.naturalWidth) {
          this.frameW = im.naturalWidth;
          this.frameH = im.naturalHeight;
          this.restRef = -999;
          this.renderFloat(this.lastF || 0);
        }
        if (loaded >= N) { clearTimeout(cap); done(); }
      };
      // WebP (~55% más liviano que el JPEG original): 20MB → 9MB en total.
      im.src = 'assets/frames/f' + String(i).padStart(3, '0') + '.webp';
      this.imgs[i] = im;
    };
    // El PRIMER cuadro con prioridad alta → el hero pinta de inmediato. Los 143
    // restantes se cargan DESPUÉS del primer pintado y con prioridad baja, para
    // no ahogar el ancho de banda de la carga inicial (fuentes, JS, above-fold).
    // Antes se disparaban los 144 a la vez y competían con todo → primera carga
    // lenta. El scrub conserva el fallback al cuadro cargado más cercano.
    load(0, 'high');
    const rest = () => { for (let i = 1; i < N; i++) load(i, 'low'); };
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (w.requestIdleCallback) w.requestIdleCallback(rest, { timeout: 1200 });
    else setTimeout(rest, 300);
  }

  // ---- render loop: cuadro sigue al scroll 1:1 (port de tickSeq) ----
  private tickSeq(): void {
    if (!this.imgs) return;
    const max = N - 1;
    const cnow = this.canvasRef().nativeElement;
    if (cnow && cnow !== this.canvas) { this.canvas = cnow; this.ctx = null; this.restRef = -999; this.settled = false; }
    if (!this.canvas) return;
    const f = Math.max(0, Math.min(max, (this.targetF || 0) * max));
    this.lastF = f;
    const REST_WINDOW = 0.05, STILL_TICKS = 6;
    const c0 = this.canvas;
    const r = c0.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.round(r.width * dpr);
    if (c0.width !== cw) { this.settled = false; }
    if (Math.abs(f - this.restRef) > REST_WINDOW) {
      this.restRef = f; this.stillCount = 0; this.settled = false;
      this.renderFloat(f);
    } else if (this.settled) {
      // ya cristalizado y quieto → nada que redibujar
    } else {
      this.stillCount++;
      if (this.stillCount >= STILL_TICKS) {
        this.settled = true;
        this.drawFrame(Math.round(f), 0);
      } else {
        this.renderFloat(f);
      }
    }
  }

  private renderFloat(f: number): void {
    const max = N - 1;
    const c = Math.max(0, Math.min(max, f));
    // Cuadro más cercano SIN blend: una sola pasada de drawImage por frame.
    // Antes se dibujaban dos cuadros (base + siguiente con alpha) y al asentar
    // se saltaba al redondeado → doble trabajo + salto visible que a 60 fps se
    // percibe como brinco. Dibujar siempre el redondeado lo elimina y es más
    // liviano; a 144 cuadros el scrub sigue viéndose fluido (como un video).
    this.drawFrame(Math.round(c), 0);
  }

  private drawFrame(base: number, frac: number): void {
    const c = this.canvas || (this.canvas = this.canvasRef().nativeElement);
    if (!c || !this.imgs) return;
    const max = N - 1;
    const b = Math.max(0, Math.min(max, Math.round(base)));
    const ready = (im?: HTMLImageElement) => !!(im && im.complete && im.naturalWidth);
    let baseImg = this.imgs[b];
    if (!ready(baseImg)) {
      for (let k = 1; k < N; k++) {
        const prev = this.imgs[b - k]; if (ready(prev)) { baseImg = prev; break; }
        const next = this.imgs[b + k]; if (ready(next)) { baseImg = next; break; }
      }
    }
    if (!ready(baseImg)) return;
    const rect = c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.round(rect.width * dpr), ch = Math.round(rect.height * dpr);
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; this.ctx = null; }
    if (!this.ctx) {
      this.ctx = c.getContext('2d', { alpha: false });
      // 'medium' en lugar de 'high': el reescalado bicúbico de alta calidad en
      // cada drawImage es caro y en laptops de 60 fps ayuda a no dropear frames;
      // la diferencia visual en una foto a pantalla completa es imperceptible.
      if (this.ctx) { this.ctx.imageSmoothingEnabled = true; this.ctx.imageSmoothingQuality = 'medium'; }
    }
    this.draw(baseImg, 1);
    if (frac > 0.001 && b < max) { const nx = this.imgs[b + 1]; if (ready(nx)) this.draw(nx, frac); }
  }

  private draw(img: HTMLImageElement, alpha: number): void {
    const ctx = this.ctx, c = this.canvas;
    if (!ctx || !c) return;
    const cw = c.width, ch = c.height;
    const cover = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    // Encuadre del logo (zoom negativo): objetivo = ajustar por ancho con un
    // pequeño overscan (1.12) para que el logotipo completo entre y solo se
    // recorten las puntas. min(cover, …) => en pantallas anchas donde el ancho
    // ya cabe (desktop) el objetivo == cover y NO cambia nada; en vertical se
    // aleja y revela "automotivo" entero. Se interpola cover→ajuste con fitP.
    const fit = Math.min(cover, (cw / img.naturalWidth) * 1.12);
    const s = cover + (fit - cover) * this.fitP;
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    const dx = (cw - dw) * 0.5, dy = (ch - dh) * 0.5;
    if (alpha < 1) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.globalAlpha = 1;
      return;
    }
    const letterbox = this.fitP > 0.001 && dh < ch - 1;
    if (letterbox) {
      // Relleno oscuro (ink del fondo) en las franjas superior e inferior. El
      // fondo del propio cuadro ya es casi negro, así que no hay costura de color.
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, cw, Math.ceil(dy) + 1);
      ctx.fillRect(0, Math.floor(dy + dh) - 1, cw, ch);
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    if (letterbox) {
      // Difuminado de la unión imagen↔fondo: degradé al ink en el borde de arriba
      // y de abajo del cuadro, para que el "corte" del video no se lea como línea.
      const fade = Math.max(1, Math.round(dh * 0.16));
      const gTop = ctx.createLinearGradient(0, dy, 0, dy + fade);
      gTop.addColorStop(0, '#0a0a0c'); gTop.addColorStop(1, 'rgba(10,10,12,0)');
      ctx.fillStyle = gTop; ctx.fillRect(0, dy, cw, fade);
      const gBot = ctx.createLinearGradient(0, dy + dh, 0, dy + dh - fade);
      gBot.addColorStop(0, '#0a0a0c'); gBot.addColorStop(1, 'rgba(10,10,12,0)');
      ctx.fillStyle = gBot; ctx.fillRect(0, dy + dh - fade, cw, fade);
    }
  }

  private resetHero(): void {
    this.targetF = 0; this.lastF = 0; this.restRef = -999; this.settled = false; this.stillCount = 0; this.fitP = 0;
    this.canvas = this.canvasRef().nativeElement; this.ctx = null;
    if (this.canvas && this.imgs) this.renderFloat(0);
    const text = this.textRef().nativeElement;
    const vig = this.vigRef().nativeElement;
    const about = this.aboutRef().nativeElement;
    const mediaw = this.mediaRef().nativeElement;
    text.style.transform = 'none'; text.style.willChange = 'auto'; text.style.opacity = '1'; text.style.pointerEvents = '';
    vig.style.opacity = '1';
    mediaw.style.transform = 'none'; mediaw.style.opacity = '1'; mediaw.style.filter = 'none'; mediaw.style.borderRadius = '0px';
    about.style.opacity = '0'; about.style.transform = 'scale(.55)'; about.style.pointerEvents = 'none';
  }
}
