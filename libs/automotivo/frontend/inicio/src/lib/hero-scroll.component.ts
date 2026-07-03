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
import {
  AutomotivoStore,
  BrandService,
  BRAND,
  WHATSAPP_LINK,
} from '@automotivo-ui-shared';

/** Número de cuadros extraídos del video en assets/frames/fNNN.jpg */
const FRAMES = 144;
/** Rango del scroll (fracción del alto pineado) donde corre el video. */
const P_IN = 0.05;
const P_OUT = 0.72;

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
  readonly brand = inject(BrandService);
  readonly waLink = WHATSAPP_LINK;
  readonly slogan = BRAND.slogan;

  private readonly sectionRef = viewChild.required<ElementRef<HTMLElement>>('section');
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly textRef = viewChild.required<ElementRef<HTMLElement>>('text');
  private readonly vigRef = viewChild.required<ElementRef<HTMLElement>>('vig');
  private readonly mediaRef = viewChild.required<ElementRef<HTMLElement>>('media');

  private imgs: HTMLImageElement[] = [];
  private ready = false;
  private ctx: CanvasRenderingContext2D | null = null;
  private target = 0; // cuadro objetivo (float) según scroll
  private current = 0; // cuadro actual (float) con suavizado
  private raf = 0;
  private onScroll = () => this.updateTarget();
  private onResize = () => { this.sizeCanvas(); this.drawFrame(this.current); };

  constructor() {
    // Al volver a "inicio", reiniciamos el hero al primer cuadro.
    effect(() => {
      if (this.store.screen() === 'inicio' && this.ready && this.isBrowser) {
        queueMicrotask(() => this.resetHero());
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.preload();
    this.sizeCanvas();
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize);
    this.loop();
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
  }

  // ---- carga de cuadros ----
  private preload(): void {
    let loaded = 0;
    for (let i = 0; i < FRAMES; i++) {
      const im = new Image();
      im.onload = () => {
        loaded++;
        if (loaded >= Math.min(6, FRAMES) && !this.ready) {
          this.ready = true;
          this.drawFrame(0);
        }
      };
      im.src = 'assets/frames/f' + String(i).padStart(3, '0') + '.jpg';
      this.imgs[i] = im;
    }
  }

  private sizeCanvas(): void {
    const cv = this.canvasRef().nativeElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(cv.clientWidth * dpr);
    cv.height = Math.round(cv.clientHeight * dpr);
    this.ctx = cv.getContext('2d');
  }

  // ---- scroll → cuadro objetivo ----
  private progress(): number {
    const sec = this.sectionRef().nativeElement;
    const total = sec.offsetHeight - window.innerHeight;
    const y = Math.min(Math.max(-sec.getBoundingClientRect().top, 0), total);
    return total > 0 ? y / total : 0;
  }

  private updateTarget(): void {
    const p = this.progress();
    const q = (a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
    this.target = q(P_IN, P_OUT) * (FRAMES - 1);
    this.applyStageFx(p, q);
  }

  // ---- suavizado con aterrizaje suave (anti-jitter) ----
  private loop = (): void => {
    const diff = this.target - this.current;
    if (Math.abs(diff) > 0.06) {
      this.current += diff * 0.15; // lerp
      this.drawFrame(this.current);
    } else if (Math.round(this.current) !== Math.round(this.target)) {
      this.current = this.target;
      this.drawFrame(this.current);
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private drawFrame(f: number): void {
    if (!this.ctx) return;
    const idx = Math.max(0, Math.min(FRAMES - 1, Math.round(f)));
    const img = this.imgs[idx];
    if (!img || !img.complete || !img.naturalWidth) return;
    const cv = this.canvasRef().nativeElement;
    const cw = cv.width, ch = cv.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }

  // ---- efectos de escenario (texto, viñeta, receso del media) ----
  private applyStageFx(p: number, q: (a: number, b: number) => number): void {
    const eio = (t: number) => t * t * (3 - 2 * t);
    const text = this.textRef().nativeElement;
    const vig = this.vigRef().nativeElement;
    const media = this.mediaRef().nativeElement;

    // el texto se va al costado y se desvanece
    const tx = eio(q(0.04, 0.34));
    text.style.transform = `translateX(${(-14 * tx).toFixed(2)}vw)`;
    text.style.opacity = String(1 - tx);
    text.style.pointerEvents = tx > 0.4 ? 'none' : 'auto';

    // el media (video) recede al final: zoom negativo + desvanece por completo
    const r = eio(q(0.7, 0.92));
    media.style.transformOrigin = '50% 50%';
    media.style.transform = `scale(${(1 - 0.34 * r).toFixed(3)})`;
    media.style.opacity = (1 - r).toFixed(3);
    media.style.filter = `blur(${(r * 6).toFixed(1)}px) brightness(${(1 - r * 0.7).toFixed(3)})`;
    media.style.borderRadius = (r * 26).toFixed(0) + 'px';

    // la viñeta se apaga con el receso (evita la costura oscura al final)
    vig.style.opacity = (1 - r).toFixed(3);
  }

  private resetHero(): void {
    this.target = 0;
    this.current = 0;
    window.scrollTo({ top: 0, behavior: 'auto' });
    this.sizeCanvas();
    this.drawFrame(0);
    const text = this.textRef().nativeElement;
    const vig = this.vigRef().nativeElement;
    const media = this.mediaRef().nativeElement;
    text.style.transform = 'translateX(0)';
    text.style.opacity = '1';
    text.style.pointerEvents = '';
    vig.style.opacity = '1';
    media.style.transform = 'none';
    media.style.opacity = '1';
    media.style.filter = 'none';
    media.style.borderRadius = '0px';
  }
}
