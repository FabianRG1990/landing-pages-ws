import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Idioma } from '../i18n/idioma';
import { Metal } from '../metal/metal';
import { PantallaInicio } from '../producto/pantalla-inicio';
import { Titular } from './titular';

const ESCRITURA_MS = 1900;

/**
 * Hero: el titular y, debajo, la app dentro de una pieza de metal líquido.
 * El metal llena el dispositivo y se retira hasta quedar solo en el bisel;
 * entonces la idea se escribe sola en el campo de la app.
 */
@Component({
  selector: 'app-hero',
  imports: [Titular, Metal, PantallaInicio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let h = i18n.t().hero;
    <section class="hero" id="inicio" data-seccion="hero">
      <div class="contenedor hero__texto">
        <p class="etiqueta" data-r style="--i: 0">{{ h.etiqueta }}</p>
        <h1 class="display hero__titulo" data-r style="--i: 1">
          <app-titular [linea]="h.titulo" />
        </h1>
        <p class="lead hero__lead" data-r style="--i: 2">{{ h.lead }}</p>
        <div class="hero__acciones" data-r style="--i: 3">
          <a class="boton boton--oro" href="#demo">
            {{ h.cta }}
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              aria-hidden="true"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </a>
          <a class="boton boton--linea" href="#recorrido">{{
            h.ctaSecundario
          }}</a>
        </div>
      </div>
      <div class="contenedor">
        <div
          class="dispositivo"
          [class.dispositivo--vivo]="vivo()"
          data-r
          style="--i: 4"
        >
          <app-metal
            [marco]="marco"
            [radio]="14"
            [revelar]="true"
            (vivo)="vivo.set(true)"
            (revelado)="alRevelar()"
          />
          <div class="dispositivo__pantalla">
            <app-pantalla-inicio
              [texto]="texto()"
              [escribiendo]="escribiendo()"
            />
          </div>
        </div>
        <p class="hero__nota" data-r style="--i: 5">{{ h.nota }}</p>
      </div>
    </section>
  `,
  styleUrl: './hero.scss',
})
export class Hero {
  protected readonly i18n = inject(Idioma);
  private readonly doc = inject(DOCUMENT);
  private readonly destruir = inject(DestroyRef);

  protected readonly vivo = signal(false);
  /** Caracteres de la idea a la vista. Sin JS, la idea completa. */
  private readonly caracteres = signal(Number.POSITIVE_INFINITY);
  protected readonly escribiendo = signal(false);
  protected readonly texto = computed(() =>
    this.i18n.t().app.idea.slice(0, this.caracteres()),
  );
  protected readonly marco = 12;

  private escrita = false;

  constructor() {
    afterNextRender(() => {
      // Con movimiento, la idea espera vacía bajo el metal. El metal (hijo)
      // puede avisar antes que esto: si ya se reveló, no se toca.
      if (!this.escrita && this.conMovimiento()) {
        this.caracteres.set(0);
        this.escribiendo.set(true);
      }
    });
  }

  private conMovimiento(): boolean {
    return this.doc.documentElement.classList.contains('con-movimiento');
  }

  protected alRevelar(): void {
    this.vivo.set(true);
    if (this.escrita || !this.conMovimiento()) return;
    this.escrita = true;
    this.caracteres.set(0);
    this.escribiendo.set(true);
    const total = this.i18n.t().app.idea.length;
    const inicio = performance.now();
    let activo = true;
    this.destruir.onDestroy(() => (activo = false));
    const paso = (ahora: number) => {
      if (!activo) return;
      const t = Math.min(1, (ahora - inicio) / ESCRITURA_MS);
      this.caracteres.set(Math.round(total * t));
      if (t < 1) requestAnimationFrame(paso);
      else {
        this.caracteres.set(Number.POSITIVE_INFINITY);
        this.escribiendo.set(false);
      }
    };
    setTimeout(() => requestAnimationFrame(paso), 250);
  }
}
