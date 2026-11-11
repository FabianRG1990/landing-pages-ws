import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
} from '@angular/core';
import { Idioma } from '../i18n/idioma';
import { Titular } from './titular';

/**
 * Control: cuatro piezas de la app que demuestran que la IA no decide
 * sola. Cada tarjeta enseña el control real (el interruptor, los tres
 * botones, la línea «Revertir», los enlaces a GitHub) y se activa al
 * entrar la sección.
 */
@Component({
  selector: 'app-control',
  imports: [Titular],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = i18n.t().control;
    @let e = i18n.t().pantallas.especificacion;
    <section class="seccion seccion--oscura" id="control" data-seccion="control">
      <div class="contenedor">
        <header class="cabeza-seccion">
          <p class="etiqueta">{{ c.etiqueta }}</p>
          <h2 class="titulo">
            <app-titular [linea]="c.titulo" />
          </h2>
          <p class="lead">{{ c.lead }}</p>
        </header>

        <ul class="rejilla">
          <li class="tarjeta">
            <div class="muestra" aria-hidden="true">
              <p class="interruptor">
                <span class="interruptor__riel"><i></i></span
                >{{ c.piloto.etiqueta }}
              </p>
              <p class="contador">{{ c.piloto.auto }} <b>3</b></p>
            </div>
            <h3 class="tarjeta__titulo">{{ c.piloto.titulo }}</h3>
            <p class="tarjeta__texto">{{ c.piloto.texto }}</p>
          </li>

          <li class="tarjeta">
            <div class="muestra" aria-hidden="true">
              <p class="botones">
                <span class="b b--si">✓ {{ e.aprobar }}</span>
                <span class="b">{{ e.cambios }}</span>
                <span class="b b--no">{{ e.detener }}</span>
              </p>
            </div>
            <h3 class="tarjeta__titulo">{{ c.aprobar.titulo }}</h3>
            <p class="tarjeta__texto">{{ c.aprobar.texto }}</p>
          </li>

          <li class="tarjeta">
            <div class="muestra muestra--texto" aria-hidden="true">
              <p>{{ c.revertir.ejemplo }}</p>
              <p class="revertir">{{ c.revertir.accion }}</p>
            </div>
            <h3 class="tarjeta__titulo">{{ c.revertir.titulo }}</h3>
            <p class="tarjeta__texto">{{ c.revertir.texto }}</p>
          </li>

          <li class="tarjeta">
            <div class="muestra muestra--lista" aria-hidden="true">
              @for (x of c.github.items; track $index) {
                <p>
                  <svg viewBox="0 0 16 16">
                    <path
                      d="M8 .2a8 8 0 0 0-2.5 15.6c.4 0 .5-.2.5-.4v-1.4c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.3 1.9.9 2.4.7 0-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.5 7.5 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3.1-1.9 3.8-3.6 4 .3.3.6.8.6 1.5v2.2c0 .2.1.5.6.4A8 8 0 0 0 8 .2z"
                      fill="currentColor"
                    />
                  </svg>
                  {{ x }}
                  @if ($index > 0) {
                    <span class="ok">✓</span>
                  }
                </p>
              }
            </div>
            <h3 class="tarjeta__titulo">{{ c.github.titulo }}</h3>
            <p class="tarjeta__texto">{{ c.github.texto }}</p>
          </li>
        </ul>
      </div>
    </section>
  `,
  styleUrl: './control.scss',
})
export class Control {
  protected readonly i18n = inject(Idioma);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const destruir = inject(DestroyRef);
    // Cuando el piloto automático se enciende (0.9 s después de entrar la
    // sección), sale una onda del interruptor en el metal del fondo.
    afterNextRender(() => {
      const riel = this.host.nativeElement.querySelector<HTMLElement>('.interruptor__riel');
      if (!riel) return;
      let espera = 0;
      const io = new IntersectionObserver(
        (e) => {
          if (!e[0].isIntersecting) return;
          io.disconnect();
          espera = window.setTimeout(() => {
            const b = riel.getBoundingClientRect();
            dispatchEvent(
              new CustomEvent('tunneller:onda', {
                detail: { x: b.left + b.width / 2, y: b.top + b.height / 2, fuerza: 1.1 },
              }),
            );
          }, 1000);
        },
        { rootMargin: '0px 0px -20% 0px' },
      );
      io.observe(riel);
      destruir.onDestroy(() => {
        io.disconnect();
        clearTimeout(espera);
      });
    });
  }
}
