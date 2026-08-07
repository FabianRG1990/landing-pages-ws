import { ChangeDetectionStrategy, Component, ElementRef, NgZone, PLATFORM_ID, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const FRAME_COUNT = 169;
const FRAMES_DIR = 'assets/about-book-frames';
const LAST = 7; // 1..6 = historias (por ahora en blanco), 7 = cierre (redes sociales)

// Cuadros calibrados a mano midiendo el movimiento real entre cuadros del video:
// 1..42 = la tapa abriendose; 43..105 = libro abierto y quieto (banda plana);
// 106..137 = la unica vuelta de pagina capturada; 138..169 = asentado otra vez.
const OPEN_ANCHOR = 50; // dentro de la banda plana, ya asentado tras abrir
const TURN_A = 100; // banda plana justo antes de la vuelta (punto de partida del clip)
const TURN_B = 137; // cuadro donde el movimiento real de la vuelta ya termino (confirmado por diff de
// pixeles entre cuadros: 138+ ya no tiene practicamente cambio real, solo ruido de compresion).
// Usar un cuadro mas alla de este punto reproduce cuadros "quietos" como si fueran movimiento,
// lo cual se percibe como que la animacion se congela justo antes de terminar.
// Duracion proporcional a la distancia real recorrida (no un tiempo fijo por
// boton) -> la velocidad se siente igual sin importar desde que cuadro se
// arranque, y nunca hay que "adivinar" cuanto tarda cada tramo.
const MS_PER_FRAME = 22;

/**
 * Álbum "Acerca de nosotros" reproduciendo la secuencia real del video del
 * libro (169 cuadros, fondo removido por segmentación) como cuadros de una
 * animación por sprite — no scroll, no CSS: cada botón dispara una
 * reproducción de un tramo exacto de cuadros sobre un canvas.
 *
 * El video solo trae una vuelta de página real (cuadros 106→137); como las
 * páginas están en blanco por ahora, ese mismo tramo se reutiliza para cada
 * "Siguiente"/"Anterior".
 *
 * Nunca se "teletransporta" el cuadro (ni con canvas ni con CSS): cada botón
 * anima con UNA sola curva de aceleración/desaceleración desde el cuadro
 * físico real donde está el libro hasta el destino final, aunque el camino
 * pase por puntos intermedios (ver playChain). Ningún punto intermedio frena
 * el movimiento — de lo contrario, un punto intermedio que cae a mitad de un
 * movimiento continuo del video (como el 100, dentro de la vuelta de página)
 * se ve como una pausa artificial que no existe en el video real.
 */
@Component({
  selector: 'bol-about-book',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about-book.component.html',
  styleUrl: './about-book.component.scss',
})
export class AboutBookComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly zone = inject(NgZone);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  readonly last = LAST;
  readonly ready = signal(false);
  readonly coverOpen = signal(false);
  readonly busy = signal(false);
  readonly current = signal(1);

  // ImageBitmap (no <img>): un <img> ya decodificado puede ser descartado por el
  // navegador bajo presion de memoria y forzar un redecode silencioso -y una
  // pausa real- la primera vez que se vuelve a dibujar, minutos despues de la
  // precarga. ImageBitmap mantiene los pixeles decodificados en memoria mientras
  // se conserve la referencia, sin ese riesgo.
  private frames: ImageBitmap[] = [];
  private ctx: CanvasRenderingContext2D | null = null;
  private dpr = 1;
  private raf = 0;

  constructor() {
    if (this.isBrowser) void this.boot();
  }

  private async boot(): Promise<void> {
    await Promise.all(Array.from({ length: FRAME_COUNT }, (_, i) => this.loadFrame(i)));
    this.sizeCanvas();
    this.draw(1);
    this.ready.set(true);
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  private async loadFrame(i: number): Promise<void> {
    const url = `${FRAMES_DIR}/frame_${String(i + 1).padStart(4, '0')}.webp`;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      this.frames[i] = await createImageBitmap(blob);
    } catch {
      // se ignora: draw() simplemente omite el cuadro si no llego a cargar
    }
  }

  private readonly onResize = (): void => {
    this.sizeCanvas();
    this.draw(this.lastDrawn);
  };

  private sizeCanvas(): void {
    const c = this.canvasRef()?.nativeElement;
    if (!c) return;
    const box = c.parentElement;
    if (!box) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = box.clientWidth || box.offsetWidth;
    const h = box.clientHeight || box.offsetHeight;
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
  }

  private lastDrawn = 1;

  private draw(frame: number): void {
    const ctx = this.ctx;
    const c = this.canvasRef()?.nativeElement;
    const idx = Math.max(1, Math.min(FRAME_COUNT, Math.round(frame))) - 1;
    const bmp = this.frames[idx];
    if (!ctx || !c || !bmp) return;
    this.lastDrawn = frame;
    ctx.clearRect(0, 0, c.width, c.height);
    const scale = Math.min(c.width / bmp.width, c.height / bmp.height);
    const dw = bmp.width * scale;
    const dh = bmp.height * scale;
    ctx.drawImage(bmp, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
  }

  private reduced(): boolean {
    return this.isBrowser && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  }

  // Cuadro fisico real donde esta el libro en reposo (nunca se asume, se seguimos paso a paso).
  private physFrame = 1;

  /**
   * Anima de una sola vez desde el cuadro fisico actual, pasando por cada
   * punto de "waypoints" en orden, hasta el ultimo. Los puntos intermedios son
   * solo coordenadas por las que cruza el movimiento -NO paradas-: toda la
   * cadena usa UNA sola curva de aceleracion/desaceleracion de principio a
   * fin. Encadenar tramos con una curva independiente cada uno (como se hacia
   * antes) frena el movimiento casi a cero en cada punto intermedio y lo
   * vuelve a arrancar desde cero del otro lado -una pausa artificial que no
   * existe en el video real, aunque el punto intermedio caiga a mitad de un
   * movimiento continuo (como pasa en la vuelta de pagina real, cuadro 100).
   */
  private playChain(waypoints: number[]): Promise<void> {
    const path = [this.physFrame, ...waypoints];
    const segLengths = path.slice(1).map((p, i) => Math.abs(p - path[i]));
    const totalDist = segLengths.reduce((a, b) => a + b, 0);
    const finalTarget = path[path.length - 1];

    const frameAtProgress = (progress: number): number => {
      let remaining = progress;
      for (let i = 0; i < segLengths.length; i++) {
        const len = segLengths[i];
        if (remaining <= len || i === segLengths.length - 1) {
          const segT = len === 0 ? 1 : remaining / len;
          return path[i] + (path[i + 1] - path[i]) * Math.min(1, segT);
        }
        remaining -= len;
      }
      return finalTarget;
    };

    if (!this.isBrowser || totalDist === 0 || this.reduced()) {
      this.draw(finalTarget);
      this.physFrame = finalTarget;
      return Promise.resolve();
    }

    cancelAnimationFrame(this.raf);
    const durationMs = totalDist * MS_PER_FRAME;
    const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    // Fuera de la zona de Angular: cada tick solo dibuja en el canvas (no toca
    // signals), asi que no hace falta -ni conviene- disparar deteccion de
    // cambios de toda la app en cada uno de los ~60 ticks por segundo.
    return this.zone.runOutsideAngular(
      () =>
        new Promise<void>((resolve) => {
          const start = performance.now();
          const tick = (now: number): void => {
            const t = Math.min(1, (now - start) / durationMs);
            this.draw(frameAtProgress(totalDist * ease(t)));
            if (t < 1) {
              this.raf = requestAnimationFrame(tick);
            } else {
              this.physFrame = finalTarget;
              resolve();
            }
          };
          this.raf = requestAnimationFrame(tick);
        }),
    );
  }

  async open(): Promise<void> {
    if (this.busy() || this.coverOpen() || !this.ready()) return;
    this.busy.set(true);
    await this.playChain([OPEN_ANCHOR]);
    this.coverOpen.set(true);
    this.current.set(1);
    this.busy.set(false);
  }

  async restart(): Promise<void> {
    if (this.busy() || !this.coverOpen() || this.current() !== LAST) return;
    this.busy.set(true);
    await this.playChain([OPEN_ANCHOR, 1]);
    this.coverOpen.set(false);
    this.current.set(1);
    this.busy.set(false);
  }

  async next(): Promise<void> {
    if (this.busy() || !this.coverOpen() || this.current() >= LAST) return;
    this.busy.set(true);
    await this.playChain([TURN_A, TURN_B]);
    this.current.set(this.current() + 1);
    this.busy.set(false);
  }

  async prev(): Promise<void> {
    if (this.busy() || !this.coverOpen() || this.current() <= 1) return;
    this.busy.set(true);
    await this.playChain([TURN_B, TURN_A]);
    this.current.set(this.current() - 1);
    this.busy.set(false);
  }

  pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }
}
