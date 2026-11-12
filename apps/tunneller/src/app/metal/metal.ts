import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Escenario } from '../escenario/escenario';
import { MotorMetal } from './motor';

const ESPERA_MS = 450;
const REVELADO_MS = 2300;

/** Arranque y llegada suaves: el metal empieza a ceder y se asienta. */
const suave = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Pieza de metal líquido que viste un dispositivo. Ocupa todo su padre
 * (que pone el radio exterior y recorta) y deja el hueco de la pantalla.
 *
 * Solo anima mientras se ve. Con movimiento reducido
 * pinta un único fotograma ya revelado.
 */
@Component({
  selector: 'app-metal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #lienzo aria-hidden="true"></canvas>`,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
      border-radius: inherit;
      overflow: hidden;
    }
    canvas {
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 0.5s ease;
    }
    :host(.vivo) canvas {
      opacity: 1;
    }
  `,
})
export class Metal {
  private readonly escenario = inject(Escenario);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly lienzo =
    viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');

  /** Bisel y radio de la pantalla, en píxeles CSS. */
  readonly marco = input(12);
  readonly radio = input(14);
  /** Si empieza cubriendo la pantalla y se retira al verse. */
  readonly revelar = input(false);

  /** El metal ya pinta: el padre puede mostrar la pantalla debajo. */
  readonly vivo = output<void>();
  /** El metal terminó de retirarse. */
  readonly revelado = output<void>();

  private motor?: MotorMetal;
  private visible = false;
  private corriendo = false;
  private tiempo = 8;
  private ultimo = 0;
  private inicioRevelado = -1;
  private progreso = 0;
  private avisado = false;
  private luz: [number, number] = [0, 0];
  private destinoLuz: [number, number] = [0, 0];

  constructor() {
    const destruir = inject(DestroyRef);

    afterNextRender(() => {
      const lienzo = this.lienzo().nativeElement;
      const win = window;
      const tactil = win.matchMedia('(pointer: coarse)').matches;
      const motor = new MotorMetal(lienzo, tactil);
      if (!motor.iniciar()) {
        this.revelado.emit();
        return;
      }
      this.motor = motor;
      this.progreso = this.revelar() && !this.escenario.reducido() ? 0 : 1;

      const ajuste = new ResizeObserver(() => {
        motor.ajustar();
        if (!this.corriendo) this.pintar();
      });
      ajuste.observe(lienzo);

      const vista = new IntersectionObserver(([e]) => {
        this.visible = e.isIntersecting;
        this.decidir();
      });
      vista.observe(this.host.nativeElement);

      const mover = (ev: PointerEvent) => {
        this.destinoLuz = [
          (ev.clientX / win.innerWidth - 0.5) * 0.18,
          (0.5 - ev.clientY / win.innerHeight) * 0.18,
        ];
      };
      if (!tactil)
        win.addEventListener('pointermove', mover, { passive: true });

      this.pintar();
      this.host.nativeElement.classList.add('vivo');
      this.vivo.emit();
      if (this.progreso >= 1) this.avisarRevelado();

      destruir.onDestroy(() => {
        this.corriendo = false;
        ajuste.disconnect();
        vista.disconnect();
        win.removeEventListener('pointermove', mover);
        motor.destruir();
      });
    });

  }

  private decidir(): void {
    if (!this.motor) return;
    const debe =
      this.visible && !this.escenario.reducido();
    if (debe && !this.corriendo) {
      this.corriendo = true;
      this.ultimo = performance.now();
      requestAnimationFrame(this.cuadro);
    } else if (!debe) {
      this.corriendo = false;
      this.pintar();
    }
  }

  private readonly cuadro = (ahora: number) => {
    if (!this.corriendo || !this.motor) return;
    const dt = Math.min(ahora - this.ultimo, 64);
    this.ultimo = ahora;
    this.motor.registrarFotograma(dt);
    this.tiempo += dt / 1000;

    if (this.progreso < 1) {
      if (this.inicioRevelado < 0) this.inicioRevelado = ahora + ESPERA_MS;
      const t = (ahora - this.inicioRevelado) / REVELADO_MS;
      this.progreso = Math.min(1, Math.max(0, t));
      if (this.progreso >= 1) this.avisarRevelado();
    }

    // La luz sigue al cursor con retraso, igual a cualquier tasa de refresco.
    const k = 1 - Math.exp(-dt / 600);
    this.luz = [
      this.luz[0] + (this.destinoLuz[0] - this.luz[0]) * k,
      this.luz[1] + (this.destinoLuz[1] - this.luz[1]) * k,
    ];
    this.pintar();
    requestAnimationFrame(this.cuadro);
  };

  private pintar(): void {
    this.motor?.dibujar({
      tiempo: this.tiempo,
      luz: this.luz,
      revelar: suave(this.progreso),
      marco: this.marco(),
      radio: this.radio(),
    });
  }

  private avisarRevelado(): void {
    if (this.avisado) return;
    this.avisado = true;
    this.revelado.emit();
  }
}
