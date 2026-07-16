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
import { BolleriaStore } from '@bolleria-ui-shared';

type FlavorKey = 'dulce' | 'mantequilla' | 'pistacho' | 'crema' | 'nutella';

interface FlavorGeom {
  src: string;
  W: number;
  CX: number;
  CY: number;
  name: string;
}

interface HeroCaption {
  inA: number;
  inB: number;
  outA: number;
  outB: number;
  eyebrow: string;
  flavor: 'drip' | 'rise' | 'plain';
  words?: string[];
  text?: string;
}

/**
 * HERO scroll-driven de "inicio": secuencia de 233 cuadros (croissant que se
 * abre, gotea dulce de leche, forma masa madre y hornea pan) repartida en 3
 * tandas de assets (v2/v4/v5, distinto aspecto cada una), con una pausa a
 * mitad de camino donde un carrusel de 5 sabores hace crossfade sobre el
 * cuadro congelado. Port directo (mismas constantes de calibración) del
 * `Component` original (`support.js`/`Bolleria.dc.html`), siguiendo el mismo
 * patrón de refs+RAF ya verificado en producción en
 * `libs/automotivo/frontend/inicio/hero-scroll.component.ts`.
 */
const N = 233;
const SPLIT_B = 97;
const SPLIT_C = 179;
const DIR_A = 'assets/hero-frames-v2';
const DIR_B = 'assets/hero-frames-v4';
const DIR_C = 'assets/hero-frames-v5';

const CROI_W = 1099;
const CROI_CX = 724;
const CROI_CY = 725;
const PHOTO_FRAC_W = 0.8;

const CROI_W_ARR = [
  1098, 1098, 1098.4, 1098.4, 1098.8, 1099.6, 1100, 1099.6, 1100, 1100, 1100.4, 1100.4, 1102, 1102,
  1103.2, 1104, 1105.2, 1105.6, 1106.8, 1107.6, 1108.4, 1109.2, 1109.6, 1110, 1110.4, 1110.8, 1111.6,
  1112, 1112.8, 1113.2, 1113.6, 1114, 1114.8, 1115.2, 1116, 1116.4, 1117.2, 1119.2, 1121.6, 1125.2,
  1130.4, 1135.6, 1140.8, 1146, 1150.8, 1155.6, 1160.4, 1164.8, 1169.6, 1174, 1177.6, 1181.2, 1184.4,
  1187.6, 1190.4, 1193.2, 1195.6, 1198.4, 1200.8, 1204, 1208, 1213.2, 1218.8, 1225.2, 1231.6, 1238,
  1244, 1250.4, 1256.4, 1262.4, 1268, 1273.6, 1278.4, 1283.2, 1286.8, 1290, 1292.4, 1294.4, 1296,
  1297.6, 1299.2, 1300.8, 1302.4, 1303.6, 1304.8, 1305.6, 1306, 1306.4, 1306.4, 1306.8, 1307.2, 1308.4,
  1309.2, 1310, 1310, 1310.5, 1310,
];
const CROI_CX_ARR = [
  725, 725, 725.2, 725.2, 725.4, 725.8, 726, 725.8, 725.6, 725.2, 725, 724.6, 724.6, 724.2, 724.4,
  724.4, 724.2, 724, 724.2, 723.8, 723.4, 723.4, 723.2, 722.6, 722.4, 722.2, 721.8, 721.2, 721.2, 721,
  720.8, 720.6, 720.6, 720.4, 720.4, 720.2, 720.2, 720.4, 720.8, 721, 721.6, 722.2, 722.8, 723, 723.4,
  723.8, 724.2, 724.4, 724.8, 725, 725.2, 725.4, 725.4, 725.4, 725.6, 725.4, 725, 724.8, 724.4, 723.6,
  723.2, 723, 723, 723, 723.4, 723.8, 724, 724, 724.2, 724.4, 724.4, 724.8, 725.2, 725.6, 725.8, 725.8,
  725.8, 725.6, 725.6, 725.6, 726, 726, 726.4, 726.6, 726.8, 726.8, 727, 727.2, 727.2, 727.4, 727.6,
  727.8, 727.8, 728.2, 728.2, 728.25, 728.33,
];
const CROI_CY_ARR = [
  725, 725.25, 725.2, 725.2, 725.4, 725.6, 725.6, 725.8, 726, 725.8, 725.8, 725.6, 725.4, 725, 724.8,
  724.6, 724.4, 724, 724, 723.8, 723.4, 723.2, 723.4, 723.2, 723.2, 723.2, 723, 722.4, 722, 721.4, 720.6,
  720, 719.4, 719, 718.8, 718.6, 718.4, 718.4, 718.4, 718.4, 718.8, 719.2, 719.8, 720.4, 721, 721.6,
  722.4, 723.2, 724.2, 725.4, 726.4, 727.4, 728.6, 729.4, 730.2, 731.2, 732.4, 733, 734.2, 735.4, 736.8,
  738.2, 739.8, 741, 742, 742.8, 743.4, 744.4, 745, 746, 747, 747.8, 748.4, 749.4, 750, 750.4, 750.8,
  751.2, 751.4, 751.8, 752.2, 752.8, 753.2, 753.8, 754, 754.4, 754.6, 755, 755.2, 755.6, 755.8, 756,
  756, 756, 756, 756, 756,
];

const CROI2_W = 1008,
  CROI2_CX = 554,
  CROI2_CY = 970,
  CROI2_SQUISH_Y = 0.9645;
const CROI3_W = 1184.5,
  CROI3_CX = 979.9,
  CROI3_CY = 441.4;

// Curva scroll->frame no lineal, ponderada por movimiento real medido entre cuadros (fija, 218 valores).
const CUM = [
  0, 0.00202, 0.00412, 0.0063, 0.00855, 0.01086, 0.0132, 0.0157, 0.01835, 0.02114, 0.02404, 0.02708,
  0.03012, 0.03321, 0.0364, 0.0396, 0.04285, 0.04614, 0.0494, 0.05266, 0.05591, 0.05919, 0.06239,
  0.06561, 0.06881, 0.07194, 0.07508, 0.07824, 0.0814, 0.0845, 0.08752, 0.09051, 0.09353, 0.09673,
  0.10007, 0.10357, 0.10739, 0.11141, 0.11555, 0.11991, 0.1245, 0.12932, 0.13433, 0.1394, 0.14453,
  0.1496, 0.15459, 0.15948, 0.16429, 0.16904, 0.17365, 0.17812, 0.1825, 0.18686, 0.19112, 0.19539,
  0.1997, 0.2041, 0.20851, 0.21298, 0.21751, 0.22215, 0.22685, 0.23164, 0.2366, 0.24159, 0.24659,
  0.2515, 0.25637, 0.26108, 0.26567, 0.27013, 0.27447, 0.27868, 0.28271, 0.28648, 0.29014, 0.29363,
  0.29693, 0.30006, 0.30312, 0.30607, 0.30884, 0.31153, 0.31408, 0.31656, 0.31891, 0.32115, 0.32331,
  0.3254, 0.32744, 0.32939, 0.33126, 0.33312, 0.33497, 0.33678, 0.33854, 0.34025, 0.34195, 0.34369,
  0.34554, 0.34746, 0.34943, 0.3515, 0.35355, 0.35571, 0.35804, 0.36041, 0.36289, 0.36436, 0.36633,
  0.36908, 0.37261, 0.37681, 0.38167, 0.38727, 0.39386, 0.40173, 0.41069, 0.42019, 0.42995, 0.43982,
  0.44977, 0.45977, 0.47041, 0.48175, 0.49375, 0.50633, 0.51874, 0.53141, 0.54437, 0.55745, 0.57041,
  0.58293, 0.59552, 0.60831, 0.62146, 0.63516, 0.64942, 0.66526, 0.68315, 0.70003, 0.71125, 0.71993,
  0.72742, 0.7344, 0.74114, 0.7476, 0.75357, 0.75918, 0.76478, 0.7705, 0.77619, 0.78144, 0.78663, 0.7918,
  0.79699, 0.80217, 0.80714, 0.81196, 0.81651, 0.82122, 0.82643, 0.83107, 0.83578, 0.8392, 0.84158,
  0.84411, 0.84752, 0.85158, 0.8546, 0.85648, 0.85794, 0.85951, 0.86115, 0.8628, 0.86454, 0.86639,
  0.86815, 0.86981, 0.87146, 0.87278, 0.87431, 0.87612, 0.87758, 0.87875, 0.88052, 0.88203, 0.88367,
  0.88511, 0.88694, 0.88866, 0.89047, 0.8922, 0.89435, 0.89722, 0.90049, 0.90449, 0.91005, 0.91539,
  0.92034, 0.92526, 0.93071, 0.93488, 0.93758, 0.93917, 0.94114, 0.94291, 0.94462, 0.94709, 0.95067,
  0.95349, 0.95653, 0.95895, 0.96253, 0.9652, 0.96772, 0.97007, 0.97308, 0.97556, 0.97792, 0.97978,
  0.98247, 0.98444, 0.98661, 0.9883, 0.99069, 0.99244, 0.99416, 0.99553, 0.99718, 0.99857, 1,
];

const FREEZE_FRAME = 80;
const FREEZE_FRAME_EXIT = 108;
const FREEZE_FRAME_FOR_SCALE_RAMP = 70;
const RISE_LIFT_PX = 72;
const CAROUSEL_VH = 600;
const PRE_CAROUSEL_GAP_VH = 35;

const FLAVOR_GEOM: Record<FlavorKey, FlavorGeom> = {
  dulce: { src: '', W: 0, CX: 0, CY: 0, name: 'Dulce de leche' }, // usa el cuadro congelado (croiFor), no una foto
  mantequilla: { src: 'assets/flavor-mantequilla.webp', W: 933, CX: 518, CY: 522.6, name: 'Mantequilla' },
  pistacho: { src: 'assets/flavor-pistacho.webp', W: 933, CX: 518, CY: 514.6, name: 'Pistacho' },
  crema: { src: 'assets/flavor-crema.webp', W: 1141, CX: 634, CY: 637.9, name: 'Crema pastelera' },
  nutella: { src: 'assets/flavor-nutella.webp', W: 935, CX: 519, CY: 523.2, name: 'Nutella' },
};
const FLAVOR_SEQ: FlavorKey[] = ['dulce', 'mantequilla', 'pistacho', 'crema', 'nutella', 'dulce'];
const LETTERING_GEOM: Record<FlavorKey, { src: string; W: number; CX: number; CY: number }> = {
  dulce: { src: 'assets/lettering-dulce.webp', W: 1107, CX: 627, CY: 379 },
  mantequilla: { src: 'assets/lettering-mantequilla.webp', W: 1149, CX: 642, CY: 345 },
  pistacho: { src: 'assets/lettering-pistacho.webp', W: 1085, CX: 640, CY: 295 },
  crema: { src: 'assets/lettering-crema.webp', W: 1025, CX: 640, CY: 358 },
  nutella: { src: 'assets/lettering-nutella.webp', W: 1115, CX: 633, CY: 335 },
};

const HERO_CAPTIONS: HeroCaption[] = [
  {
    inA: 106,
    inB: 120,
    outA: 142,
    outB: 154,
    eyebrow: 'Relleno',
    flavor: 'drip',
    words: 'Dulce de leche, crema pastelera o nutella — nunca somos tacaños con el relleno.'.split(' '),
  },
  {
    inA: 160,
    inB: 172,
    outA: 190,
    outB: 200,
    eyebrow: 'Fermentación',
    flavor: 'rise',
    text: 'La masa madre descansa, fermenta y crece a su propio ritmo.',
  },
  {
    inA: 203,
    inB: 210,
    outA: 214,
    outB: 224,
    eyebrow: 'Horneado',
    flavor: 'plain',
    text: 'Recién salido del horno, listo cada mañana.',
  },
];

@Component({
  selector: 'bol-hero-scroll',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero-scroll.component.html',
  styleUrl: './hero-scroll.component.scss',
})
export class HeroScrollComponent implements AfterViewInit, OnDestroy {
  private readonly store = inject(BolleriaStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly wrapRef = viewChild.required<ElementRef<HTMLElement>>('heroWrap');
  private readonly stageRef = viewChild.required<ElementRef<HTMLElement>>('heroStage');
  private readonly photoBoxRef = viewChild.required<ElementRef<HTMLElement>>('photoBox');
  private readonly photoRef = viewChild.required<ElementRef<HTMLImageElement>>('heroPhoto');
  private readonly illusRef = viewChild.required<ElementRef<HTMLImageElement>>('heroIllus');
  private readonly logoRef = viewChild.required<ElementRef<HTMLImageElement>>('heroLogo');
  private readonly introCapRef = viewChild.required<ElementRef<HTMLElement>>('introCap');
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('heroCanvas');
  private readonly hintRef = viewChild.required<ElementRef<HTMLElement>>('scrollHint');
  private readonly captionRef = viewChild.required<ElementRef<HTMLElement>>('heroCaption');
  private readonly captionEyebrowRef = viewChild.required<ElementRef<HTMLElement>>('captionEyebrow');
  private readonly captionTextRef = viewChild.required<ElementRef<HTMLElement>>('captionText');
  private readonly captionUnderlineRef = viewChild.required<ElementRef<HTMLElement>>('captionUnderline');

  // ---- motor de frames ----
  private frames: HTMLImageElement[] = [];
  private broken = new Set<number>();
  private inflight = new Set<number>();
  private ready = false;
  private booted = false;
  private restRef = -999;
  private stillCount = 0;
  private settled = false;
  private lastF = 0;
  private targetF = 0;
  private active = false;
  private dpr = 1;
  private ctx: CanvasRenderingContext2D | null = null;
  private carouselActive = false;
  private carouselT = 0;

  private letteringImgs: Partial<Record<FlavorKey, HTMLImageElement>> = {};
  private flavorImgs: Partial<Record<FlavorKey, HTMLImageElement>> = {};
  private lastCapIdx = -1;
  private capWordEls: HTMLElement[] | null = null;
  private heroInDone = false;
  private plDone = false;
  private raf = 0;

  constructor() {
    // Al terminar el preloader: revela el logo del hero y calcula la posición inicial.
    effect(() => {
      if (this.store.loaded() && this.isBrowser && !this.plDone) {
        this.plDone = true;
        requestAnimationFrame(() => {
          this.playHeroIn();
          this.updateHero();
        });
      }
    });
    // Al volver a "inicio" (cortina), el scroll ya se reseteó a 0 — solo hace falta
    // re-mostrar el logo si hacía falta y recalcular con la posición actual.
    effect(() => {
      this.store.settleTick();
      if (this.isBrowser && this.store.screen() === 'inicio' && this.plDone) {
        this.heroInDone = false;
        this.playHeroIn();
        this.updateHero();
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    if (!this.reduced()) this.wrapRef().nativeElement.style.height = '1531vh';
    this.bootHeroFrames();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.updateHero();
      if (!this.ready || !this.active || !this.ctx) return;
      if (this.carouselActive) {
        this.renderFlavorCarousel();
        return;
      }
      const max = N - 1;
      const f = Math.max(0, Math.min(max, this.targetF));
      const REST_WINDOW = 0.05,
        STILL_TICKS = 6;
      if (Math.abs(f - this.restRef) > REST_WINDOW) {
        this.restRef = f;
        this.stillCount = 0;
        this.settled = false;
        this.renderHeroFloat(f);
      } else if (this.settled) {
        // ya nítido y quieto
      } else {
        this.stillCount++;
        if (this.stillCount >= STILL_TICKS) {
          this.settled = true;
          this.drawHeroFrame(f);
        } else {
          this.renderHeroFloat(f);
        }
      }
    };
    this.raf = requestAnimationFrame(loop);
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
  }

  private readonly onResize = (): void => {
    this.sizeHeroCanvas();
    this.updateHero();
  };

  // ---- carga de frames ----
  private framePath(i: number): string {
    if (i >= SPLIT_C) return `${DIR_B}/frame_${String(i - SPLIT_C + 67).padStart(4, '0')}.webp`;
    if (i >= SPLIT_B) return `${DIR_C}/frame_${String(i - SPLIT_B).padStart(4, '0')}.webp?v=colorfix3`;
    return `${DIR_A}/frame_${String(i).padStart(4, '0')}.webp`;
  }

  private croiFor(b: number): [number, number, number] {
    if (b >= SPLIT_C) return [CROI3_W, CROI3_CX, CROI3_CY];
    if (b >= SPLIT_B) return [CROI2_W, CROI2_CX, CROI2_CY];
    const i = Math.max(0, Math.min(CROI_W_ARR.length - 1, Math.round(b)));
    return [CROI_W_ARR[i], CROI_CX_ARR[i], CROI_CY_ARR[i]];
  }

  private loadHeroFrame(i: number): Promise<void> {
    if (this.frames[i] || this.broken.has(i)) return Promise.resolve();
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth > 0) this.frames[i] = img;
        else this.markHeroFrameBroken(i);
        res();
      };
      img.onerror = () => {
        this.markHeroFrameBroken(i);
        res();
      };
      img.decoding = 'async';
      img.src = this.framePath(i);
    });
  }

  private markHeroFrameBroken(i: number): void {
    this.broken.add(i);
  }

  private async bootHeroFrames(): Promise<void> {
    if (this.booted) return;
    this.booted = true;
    const first = Math.min(70, N);
    await Promise.all(Array.from({ length: first }, (_, i) => this.loadHeroFrame(i)));
    this.ready = true;
    this.sizeHeroCanvas();
    this.renderHeroFloat(0);
    let next = first;
    const worker = async () => {
      while (next < N) await this.loadHeroFrame(next++);
    };
    for (let k = 0; k < 18; k++) worker();
    this.loadFlavorImages();
  }

  private loadFlavorImages(): void {
    const ready = (img: HTMLImageElement, key: FlavorKey, store: Partial<Record<FlavorKey, HTMLImageElement>>) => {
      (img.decode ? img.decode() : Promise.resolve()).catch(() => undefined).then(() => {
        store[key] = img;
      });
    };
    (Object.keys(FLAVOR_GEOM) as FlavorKey[]).forEach((key) => {
      if (key === 'dulce') return;
      const img = new Image();
      img.decoding = 'async';
      img.src = FLAVOR_GEOM[key].src;
      ready(img, key, this.flavorImgs);
    });
    (Object.keys(LETTERING_GEOM) as FlavorKey[]).forEach((key) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = LETTERING_GEOM[key].src;
      ready(img, key, this.letteringImgs);
    });
  }

  // ---- dibujo ----
  private drawGenericCroissant(
    img: HTMLImageElement | undefined,
    croiW: number,
    croiCx: number,
    croiCy: number,
    alpha: number,
    yOffset: number,
    scaleMul: number,
    blurPx: number,
  ): void {
    const ctx = this.ctx;
    const c = this.canvasRef().nativeElement;
    if (!ctx || !c || !img || !img.complete || !img.naturalWidth) return;
    const cw = c.width,
      ch = c.height,
      dpr = this.dpr;
    const boxCss = Math.min(0.9 * window.innerWidth, 720);
    const targetCroiW = PHOTO_FRAC_W * boxCss * dpr * (scaleMul || 1);
    const s = targetCroiW / croiW;
    const dw = img.naturalWidth * s,
      dh = img.naturalHeight * s;
    const dx = cw / 2 - croiCx * s,
      dy = ch / 2 - croiCy * s + (yOffset || 0);
    try {
      if (alpha < 1) ctx.globalAlpha = alpha;
      if (blurPx) ctx.filter = `blur(${blurPx}px)`;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.filter = 'none';
      if (alpha < 1) ctx.globalAlpha = 1;
    } catch {
      ctx.globalAlpha = 1;
      ctx.filter = 'none';
    }
  }

  private drawLettering(
    img: HTMLImageElement | undefined,
    W: number,
    CX: number,
    CY: number,
    alpha: number,
    riseOffset: number,
    targetCy: number,
    scaleMul: number,
  ): void {
    const ctx = this.ctx;
    const c = this.canvasRef().nativeElement;
    if (!ctx || !c || !img || alpha <= 0.003 || !img.complete || !img.naturalWidth) return;
    const dpr = this.dpr || 1;
    const boxCss = Math.min(0.9 * window.innerWidth, 720);
    const targetW = 0.66 * boxCss * dpr * (scaleMul || 1);
    const s = targetW / W;
    const dw = img.naturalWidth * s,
      dh = img.naturalHeight * s;
    const cx = c.width / 2,
      cy = targetCy != null ? targetCy : c.height * 0.2;
    const dx = cx - CX * s,
      dy = cy - CY * s + riseOffset;
    try {
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
    } catch {
      ctx.globalAlpha = 1;
      ctx.filter = 'none';
    }
  }

  private flavorKeyframe(key: FlavorKey): { img?: HTMLImageElement; W: number; CX: number; CY: number } {
    if (key === 'dulce') {
      const [w, cx, cy] = this.croiFor(FREEZE_FRAME);
      return { img: this.frames[FREEZE_FRAME], W: w, CX: cx, CY: cy };
    }
    const g = FLAVOR_GEOM[key];
    return { img: this.flavorImgs[key], W: g.W, CX: g.CX, CY: g.CY };
  }

  private flavorKeyframeExit(): { img?: HTMLImageElement; W: number; CX: number; CY: number } {
    const [w, cx, cy] = this.croiFor(FREEZE_FRAME_EXIT);
    return { img: this.frames[FREEZE_FRAME_EXIT], W: w, CX: cx, CY: cy };
  }

  private renderFlavorCarousel(): void {
    const ctx = this.ctx;
    const c = this.canvasRef().nativeElement;
    if (!ctx || !c) return;
    const seq = FLAVOR_SEQ,
      n = seq.length - 1;
    const segT = this.clamp01(this.carouselT) * n;
    const idx = Math.min(n - 1, Math.floor(segT));
    const rawFrac = this.clamp01(segT - idx);
    const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const isExit = idx === n - 1;
    const A = this.flavorKeyframe(seq[idx]);
    const B = isExit ? this.flavorKeyframeExit() : this.flavorKeyframe(seq[idx + 1]);
    ctx.clearRect(0, 0, c.width, c.height);
    const band = this.getCarouselBand();
    if (!band) return;
    const letteringCy = band.letteringCy,
      scaleMul = band.scaleMul;
    const yOff = band.croissantCy - c.height / 2 + this.extraLift(FREEZE_FRAME) - this.introSettle(FREEZE_FRAME);
    const gA = LETTERING_GEOM[seq[idx]],
      gB = LETTERING_GEOM[seq[idx + 1]];

    const aOutT = ease(this.clamp01((rawFrac - 0.4) / 0.08));
    const bInT = this.clamp01((rawFrac - 0.44) / 0.16);
    let alphaImgA = 1 - aOutT,
      alphaImgB = Math.pow(bInT, 2.0);
    const scaleImgA = 1 - 0.15 * aOutT,
      scaleImgB = 0.9 + 0.1 * bInT;
    const blurImgA = 5 * aOutT,
      blurImgB = 7 * (1 - bInT);
    let riseTxtA = 0,
      riseTxtB = 0;
    const riseImgB = -10 * (this.dpr || 1) * (1 - bInT);

    const OUT_START = 0.28,
      OUT_END = 0.4,
      IN_START = 0.6,
      IN_END = 0.72;
    const txtOutT = this.clamp01((rawFrac - OUT_START) / (OUT_END - OUT_START));
    const txtInT = this.clamp01((rawFrac - IN_START) / (IN_END - IN_START));
    let alphaTxtA = 1 - ease(txtOutT),
      alphaTxtB = ease(txtInT);
    const scaleTxtA = 1 - 0.14 * ease(txtOutT),
      scaleTxtB = 0.88 + 0.12 * ease(txtInT);
    riseTxtA = -16 * (this.dpr || 1) * ease(txtOutT);
    riseTxtB = 14 * (this.dpr || 1) * (1 - ease(txtInT));
    let riseImgA = 0;

    const INTRO_T = 0.03;
    if (idx === 0 && this.carouselT < INTRO_T) {
      const it = this.clamp01(this.carouselT / INTRO_T);
      const ie = ease(it);
      alphaImgA = 1;
      riseImgA = 0;
      alphaTxtA = ie;
      alphaTxtB = 0;
    }

    const yOffB = isExit
      ? band.croissantCy - c.height / 2 + this.extraLift(FREEZE_FRAME_EXIT) - this.introSettle(FREEZE_FRAME_EXIT)
      : yOff;
    if (A.img) this.drawGenericCroissant(A.img, A.W, A.CX, A.CY, alphaImgA, yOff + riseImgA * 0.5, scaleMul * scaleImgA, blurImgA);
    if (B.img) this.drawGenericCroissant(B.img, B.W, B.CX, B.CY, alphaImgB, yOffB + riseImgB, scaleMul * scaleImgB, blurImgB);
    this.drawLettering(this.letteringImgs[seq[idx]], gA.W, gA.CX, gA.CY, alphaTxtA, riseTxtA, letteringCy, scaleMul * scaleTxtA);
    if (!isExit) this.drawLettering(this.letteringImgs[seq[idx + 1]], gB.W, gB.CX, gB.CY, alphaTxtB, riseTxtB, letteringCy, scaleMul * scaleTxtB);
    this.captionRef().nativeElement.style.opacity = '0';
  }

  private sizeHeroCanvas(): void {
    const c = this.canvasRef()?.nativeElement;
    if (!c) return;
    const box = c.parentElement;
    if (!box) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = box.clientWidth || box.offsetWidth,
      h = box.clientHeight || box.offsetHeight;
    if (!w || !h) return;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d', { alpha: true });
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    this.ctx = ctx;
    this.dpr = dpr;
    this.renderHeroFloat(this.lastF);
  }

  private drawHeroImg(
    img: HTMLImageElement,
    alpha: number,
    yOffset: number,
    croiW: number,
    croiCx: number,
    croiCy: number,
    squishY: number,
    scaleMulOverride: number,
  ): void {
    const ctx = this.ctx;
    const c = this.canvasRef().nativeElement;
    if (!ctx || !c || !img.complete || !img.naturalWidth) return;
    const cw = c.width,
      ch = c.height,
      dpr = this.dpr;
    const CW = croiW || CROI_W,
      CX = croiCx != null ? croiCx : CROI_CX,
      CY = croiCy != null ? croiCy : CROI_CY;
    const SQY = squishY || 1;
    const scaleMul = scaleMulOverride != null ? scaleMulOverride : this.getCarouselBand()?.scaleMul ?? 1;
    const boxCss = Math.min(0.9 * window.innerWidth, 720);
    const targetCroiW = PHOTO_FRAC_W * boxCss * dpr * scaleMul;
    const s = targetCroiW / CW;
    const dw = img.naturalWidth * s,
      dh = img.naturalHeight * s * SQY;
    const dx = cw / 2 - CX * s;
    const dy = ch / 2 - CY * s * SQY + (yOffset || 0);
    try {
      if (alpha < 1) ctx.globalAlpha = alpha;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.globalAlpha = 1;
    } catch {
      ctx.globalAlpha = 1;
    }
  }

  private ensureHeroFrame(i: number): void {
    if (i < 0 || i >= N || this.frames[i] || this.broken.has(i) || this.inflight.has(i)) return;
    this.inflight.add(i);
    this.loadHeroFrame(i).then(() => this.inflight.delete(i));
  }

  private nearestGoodHeroFrame(want: number): HTMLImageElement | null {
    for (let o = 1; o < N; o++) {
      const a = this.frames[want - o];
      if (a) return a;
      const b = this.frames[want + o];
      if (b) return b;
    }
    return null;
  }

  private getCarouselBand(): { letteringCy: number; croissantCy: number; scaleMul: number } | null {
    const c = this.canvasRef()?.nativeElement;
    if (!c) return null;
    const boxCss = Math.min(0.9 * window.innerWidth, 720);
    const U = boxCss * (this.dpr || 1);
    let bandH = U * 1.15;
    const scaleMul = bandH > c.height * 0.92 ? (c.height * 0.92) / bandH : 1;
    bandH = Math.min(bandH, c.height * 0.92);
    const bandTop = c.height / 2 - bandH / 2;
    return { letteringCy: bandTop + 0.24 * bandH, croissantCy: bandTop + 0.68 * bandH, scaleMul };
  }

  private drawEligeTuSaborTitle(f: number): void {
    const op = this.capOpacity(f, 34, 50, 70, 79);
    if (op <= 0.003) return;
    const ctx = this.ctx;
    const c = this.canvasRef()?.nativeElement;
    if (!ctx || !c) return;
    const band = this.getCarouselBand();
    if (!band) return;
    const dpr = this.dpr || 1;
    const cx = c.width / 2,
      cy = band.letteringCy + (1 - op) * 18 * dpr;
    ctx.save();
    ctx.globalAlpha = op;
    ctx.translate(cx, cy);
    const scale = (0.9 + 0.1 * op) * (band.scaleMul || 1);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontPx = Math.round(52 * dpr);
    ctx.font = `italic 600 ${fontPx}px 'Cormorant Garamond', serif`;
    ctx.fillStyle = '#2E2A1C';
    ctx.fillText('Elige tu sabor', 0, 0);
    ctx.restore();
  }

  private drawHeroFrame(base: number): void {
    const ctx = this.ctx;
    const c = this.canvasRef()?.nativeElement;
    const max = N - 1;
    const b = Math.max(0, Math.min(max, Math.round(base)));
    let baseImg = this.frames[b];
    if (!baseImg) {
      this.ensureHeroFrame(b);
      baseImg = this.nearestGoodHeroFrame(b) ?? undefined!;
    }
    if (!baseImg || !ctx || !c) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const band = this.getCarouselBand();
    const yOffset = (band ? band.croissantCy - c.height / 2 : 0) + this.extraLift(b) - this.introSettle(b);
    const [cW, cCX, cCY] = this.croiFor(b);
    const squishY = b >= SPLIT_B && b < SPLIT_C ? CROI2_SQUISH_Y : 1;
    const bandS0 = this.getCarouselBand();
    const ramp0 = this.clamp01(b / FREEZE_FRAME_FOR_SCALE_RAMP);
    const scaleMulRamp = bandS0 ? 1 + (bandS0.scaleMul - 1) * ramp0 : 1;
    this.drawHeroImg(baseImg, 1, yOffset, cW, cCX, cCY, squishY, scaleMulRamp);
    this.drawEligeTuSaborTitle(b);
  }

  private extraLift(b: number): number {
    const t = this.clamp01((b - 33) / 76);
    const e = t * t * (3 - 2 * t);
    return -(e * 16);
  }

  private introSettle(b: number): number {
    const t = this.clamp01(b / 45);
    const e = t * t * t * (t * (t * 6 - 15) + 10);
    return RISE_LIFT_PX * (1 - e);
  }

  private renderHeroFloat(f: number): void {
    const max = N - 1;
    const cl = Math.max(0, Math.min(max, f));
    this.lastF = cl;
    this.drawHeroFrame(cl);
  }

  private cumToFrame(pv: number): number {
    const n = CUM.length;
    if (pv <= 0) return 0;
    if (pv >= 1) return n - 1;
    let lo = 0,
      hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (CUM[mid] <= pv) lo = mid;
      else hi = mid;
    }
    const c0 = CUM[lo],
      c1 = CUM[hi];
    return lo + (pv - c0) / (c1 - c0 || 1);
  }

  private clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private playHeroIn(): void {
    const el = this.logoRef()?.nativeElement;
    if (!el || this.heroInDone) return;
    this.heroInDone = true;
    if (this.reduced()) {
      el.style.opacity = '1';
      return;
    }
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'heroLogoIn 1.35s cubic-bezier(.2,.75,.2,1) both';
  }

  private reduced(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  private capOpacity(f: number, inA: number, inB: number, outA: number, outB: number): number {
    if (f <= inA || f >= outB) return 0;
    if (f < inB) return this.clamp01((f - inA) / (inB - inA));
    if (f <= outA) return 1;
    return 1 - this.clamp01((f - outA) / (outB - outA));
  }

  // ---- scroll -> coreografía (port de updateHero) ----
  private updateHero(): void {
    const R = {
      wrap: this.wrapRef()?.nativeElement,
      stage: this.stageRef()?.nativeElement,
      logo: this.logoRef()?.nativeElement,
      illus: this.illusRef()?.nativeElement,
      photo: this.photoRef()?.nativeElement,
      photoBox: this.photoBoxRef()?.nativeElement,
      canvas: this.canvasRef()?.nativeElement,
      hint: this.hintRef()?.nativeElement,
      introCap: this.introCapRef()?.nativeElement,
      caption: this.captionRef()?.nativeElement,
      captionEyebrow: this.captionEyebrowRef()?.nativeElement,
      captionText: this.captionTextRef()?.nativeElement,
      captionUnderline: this.captionUnderlineRef()?.nativeElement,
    };
    if (!R.wrap || !R.stage) return;
    const rect = R.wrap.getBoundingClientRect();
    const vh = window.innerHeight;
    const scrolled = -rect.top;
    const SEQ = 2.4 * vh;
    const p = this.clamp01(scrolled / (SEQ || 1));
    const seg = (a: number, b: number) => this.clamp01((p - a) / (b - a));
    const L = this.lerp.bind(this);
    const RISE_A = 0.86,
      RISE_B = 0.97,
      RISE_GAP = 0.12;
    const riseT = seg(RISE_A, RISE_B);
    const riseE = riseT * riseT * riseT * (riseT * (riseT * 6 - 15) + 10);
    const riseLiftPx = RISE_LIFT_PX * riseE;

    if (R.logo && p > 0.001) {
      R.logo.style.animation = 'none';
      R.logo.style.opacity = String(1 - seg(0.18, 0.4));
    }
    const wr = this.clamp01((p - 0.54) / (0.86 - 0.54));
    const edge = -14 + wr * 128;
    const a = (edge - 9).toFixed(1),
      b = (edge + 9).toFixed(1);
    if (R.illus) {
      const e = seg(0.18, 0.52);
      const sc = L(0.46, 1, e);
      const tx = L(14.0, 0, e);
      const ty = L(-15.5, 0, e);
      const rot = L(29.7, 0, e);
      R.illus.style.opacity = String(seg(0.2, 0.34));
      R.illus.style.transform = `translate(${tx}%,${ty}%) scale(${sc}) rotate(${rot}deg)`;
      if (p > 0.5) {
        const g = `linear-gradient(122deg, rgba(0,0,0,0) ${a}%, #000 ${b}%)`;
        R.illus.style.webkitMaskImage = g;
        R.illus.style.maskImage = g;
      } else {
        R.illus.style.webkitMaskImage = 'none';
        R.illus.style.maskImage = 'none';
      }
    }
    if (R.photo) {
      R.photo.style.opacity = p > 0.5 ? '1' : '0';
      const grad = `linear-gradient(122deg, #000 ${a}%, rgba(0,0,0,0) ${b}%)`;
      R.photo.style.webkitMaskImage = grad;
      R.photo.style.maskImage = grad;
      R.photo.style.transform = 'scale(1)';
    }
    if (R.hint) R.hint.style.opacity = String(1 - seg(0.02, 0.12));
    if (R.photoBox) {
      const band = this.getCarouselBand();
      if (band) {
        const ramp = this.clamp01((p - 0.2) / (0.55 - 0.2));
        const dpr = this.dpr || 1;
        R.photoBox.style.transform =
          ramp > 0.001 || riseLiftPx > 0.001
            ? `translateY(${ramp * (band.croissantCy / dpr - vh / 2) - riseLiftPx}px)`
            : '';
      }
    }
    if (R.introCap) {
      const ico = this.capOpacity(p, 0.5, 0.505, RISE_A, RISE_B);
      R.introCap.style.opacity = String(ico);
      const gradTxt = `linear-gradient(122deg, #000 ${a}%, rgba(0,0,0,0) ${b}%)`;
      R.introCap.style.webkitMaskImage = gradTxt;
      R.introCap.style.maskImage = gradTxt;
    }

    if (this.reduced()) {
      this.active = false;
      if (R.canvas) R.canvas.style.opacity = '0';
      if (R.caption) R.caption.style.opacity = '0';
      R.stage.style.opacity = String(1 - seg(0.97, 1));
      return;
    }
    if (!this.ready) {
      this.active = false;
      if (R.canvas) R.canvas.style.opacity = '0';
      if (R.caption) R.caption.style.opacity = '0';
      return;
    }

    const VID_START = (RISE_B + RISE_GAP) * SEQ;
    const total = Math.max(1, R.wrap.offsetHeight - vh);
    const CAROUSEL_PX = (CAROUSEL_VH / 100) * vh;
    const PRE_GAP_PX = (PRE_CAROUSEL_GAP_VH / 100) * vh;
    const VID_ORIGINAL = Math.max(1, total - VID_START - CAROUSEL_PX - PRE_GAP_PX);
    const pv0 = CUM[FREEZE_FRAME];
    const freezeStart = VID_START + pv0 * VID_ORIGINAL;
    const holdStart = freezeStart + PRE_GAP_PX;
    const holdEnd = holdStart + CAROUSEL_PX;
    const inPreGap = scrolled >= freezeStart && scrolled < holdStart;
    const inHold = scrolled >= holdStart && scrolled < holdEnd;
    const exitJumpPx = (CUM[FREEZE_FRAME_EXIT] - pv0) * VID_ORIGINAL;
    const adjScrolled = scrolled >= holdEnd ? scrolled - PRE_GAP_PX - CAROUSEL_PX + exitJumpPx : Math.min(scrolled, freezeStart);
    const pv = this.clamp01((adjScrolled - VID_START) / VID_ORIGINAL);

    if (inHold) {
      this.targetF = FREEZE_FRAME;
      this.carouselActive = true;
      this.carouselT = this.clamp01((scrolled - holdStart) / CAROUSEL_PX);
    } else if (inPreGap) {
      this.targetF = FREEZE_FRAME;
      this.carouselActive = false;
    } else {
      this.carouselActive = false;
      this.targetF = this.cumToFrame(pv);
    }
    this.active = true;
    if (this.ready) {
      const bf = Math.floor(this.targetF);
      for (let k = -6; k <= 60; k++) this.ensureHeroFrame(bf + k);
    }

    const canvasOn = scrolled >= VID_START;
    const photoOff = canvasOn;
    if (R.canvas) R.canvas.style.opacity = canvasOn ? '1' : '0';
    if (R.photo) {
      if (photoOff) {
        R.photo.style.transition = 'none';
        R.photo.style.opacity = '0';
        R.photo.style.display = 'none';
      } else {
        R.photo.style.display = '';
        R.photo.style.transition = 'none';
      }
    }
    if (R.illus) R.illus.style.display = photoOff ? 'none' : '';
    if (R.logo) R.logo.style.display = photoOff ? 'none' : '';

    const f = this.targetF;
    let activeCap: HeroCaption | null = null,
      activeOp = 0;
    for (const cap of HERO_CAPTIONS) {
      const o = this.capOpacity(f, cap.inA, cap.inB, cap.outA, cap.outB);
      if (o > 0.001) {
        activeCap = cap;
        activeOp = o;
        break;
      }
    }
    if (R.caption) {
      R.caption.style.opacity = String(canvasOn ? activeOp : 0);
      R.caption.style.transform = `translateY(${(1 - activeOp) * 10}px)`;
      const capIdx = activeCap ? HERO_CAPTIONS.indexOf(activeCap) : -1;
      if (activeCap && this.lastCapIdx !== capIdx) {
        this.lastCapIdx = capIdx;
        if (R.captionEyebrow) R.captionEyebrow.textContent = activeCap.eyebrow;
        if (R.captionText) {
          if (activeCap.words) {
            R.captionText.innerHTML = activeCap.words
              .map((w) => `<span class="cw" style="display:inline-block;will-change:transform,opacity">${w}</span>`)
              .join(' ');
            this.capWordEls = Array.from(R.captionText.querySelectorAll<HTMLElement>('.cw'));
          } else {
            R.captionText.textContent = activeCap.text ?? '';
            this.capWordEls = null;
          }
          R.captionText.style.transform = '';
          R.captionText.style.filter = '';
        }
      }
      if (activeCap) {
        if (activeCap.flavor === 'drip' && this.capWordEls) {
          const n = this.capWordEls.length;
          this.capWordEls.forEach((el, i) => {
            const wp = this.clamp01(activeOp * n - i);
            el.style.opacity = String(wp);
            el.style.transform = `translateY(${-(1 - wp) * 14}px)`;
          });
          if (R.captionUnderline) R.captionUnderline.style.width = activeOp * 72 + 'px';
        } else if (activeCap.flavor === 'rise') {
          if (R.captionText) {
            R.captionText.style.transform = `scale(${0.95 + 0.05 * activeOp})`;
            R.captionText.style.filter = `blur(${(1 - activeOp) * 3}px)`;
          }
          if (R.captionUnderline) R.captionUnderline.style.width = '0';
        } else {
          if (R.captionUnderline) R.captionUnderline.style.width = '0';
        }
      }
    }
    R.stage.style.opacity = String(1 - this.clamp01((pv - 0.985) / 0.015));
  }
}
