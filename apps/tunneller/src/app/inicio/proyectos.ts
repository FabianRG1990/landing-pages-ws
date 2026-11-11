import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Idioma } from '../i18n/idioma';
import { Titular } from './titular';

/**
 * Proyectos ya construidos con Tunneller. Las tarjetas se arman con el
 * scroll (ver Coreografia): contorno, relleno, la miniatura dibujándose
 * pieza a pieza y el texto. Cada tarjeta lleva una vista de la app
 * dibujada en SVG (no capturas del vídeo, que van a 720p) y las
 * cifras reales que muestra la demo; donde no hay cifras, no se inventan.
 */
@Component({
  selector: 'app-proyectos',
  imports: [Titular],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = i18n.t().proyectos;
    <section
      class="seccion seccion--oscura"
      id="proyectos"
      data-seccion="proyectos"
    >
      <div class="contenedor">
        <header class="cabeza-seccion">
          <p class="etiqueta">{{ p.etiqueta }}</p>
          <h2 class="titulo">
            <app-titular [linea]="p.titulo" />
          </h2>
          <p class="lead">{{ p.lead }}</p>
        </header>

        <ul class="proyectos">
          @for (x of p.items; track x.repo; let i = $index) {
            <li class="proyecto">
              <div class="vista" aria-hidden="true">
                @switch (i) {
                  @case (0) {
                    <svg viewBox="0 0 200 120">
                      <rect
                        x="20"
                        y="16"
                        width="160"
                        height="88"
                        rx="6"
                        fill="#f4f3ef"
                      />
                      <g transform="translate(66 60)">
                        <path
                          d="M0 0 L0 -32 A32 32 0 0 1 27.7 16 Z"
                          fill="#c98a5e"
                        />
                        <path
                          d="M0 0 L27.7 16 A32 32 0 0 1 -27.7 16 Z"
                          fill="#5f9e88"
                        />
                        <path
                          d="M0 0 L-27.7 16 A32 32 0 0 1 0 -32 Z"
                          fill="#8a7fb8"
                        />
                        <circle r="4" fill="#f4f3ef" />
                      </g>
                      <rect
                        x="110"
                        y="34"
                        width="56"
                        height="9"
                        rx="3"
                        fill="none"
                        stroke="#c9c8c3"
                      />
                      <rect
                        x="110"
                        y="48"
                        width="56"
                        height="9"
                        rx="3"
                        fill="none"
                        stroke="#c9c8c3"
                      />
                      <rect
                        x="110"
                        y="62"
                        width="56"
                        height="9"
                        rx="3"
                        fill="none"
                        stroke="#c9c8c3"
                      />
                      <rect
                        x="110"
                        y="78"
                        width="56"
                        height="10"
                        rx="3"
                        fill="#b9533a"
                      />
                    </svg>
                  }
                  @case (1) {
                    <svg viewBox="0 0 200 120">
                      <g transform="translate(60 12)">
                        @for (c of casillas; track $index) {
                          <rect
                            [attr.x]="c.x"
                            [attr.y]="c.y"
                            width="12"
                            height="12"
                            [attr.fill]="c.oscura ? '#8c6c3b' : '#ecdcbc'"
                          />
                        }
                      </g>
                    </svg>
                  }
                  @case (2) {
                    <svg viewBox="0 0 200 120">
                      @for (col of [0, 1, 2]; track col) {
                        <rect
                          [attr.x]="28 + col * 50"
                          y="16"
                          width="44"
                          height="88"
                          rx="5"
                          fill="#1c2336"
                        />
                        <rect
                          [attr.x]="34 + col * 50"
                          y="24"
                          width="22"
                          height="4"
                          rx="2"
                          fill="#6f7891"
                        />
                        @for (f of [0, 1, 2].slice(0, 3 - col); track f) {
                          <rect
                            [attr.x]="34 + col * 50"
                            [attr.y]="34 + f * 20"
                            width="32"
                            height="15"
                            rx="3"
                            [attr.fill]="col === 2 ? '#2b4a3f' : '#283149'"
                          />
                        }
                      }
                    </svg>
                  }
                  @case (3) {
                    <svg viewBox="0 0 200 120">
                      <g
                        fill="none"
                        stroke-width="7"
                        stroke-linecap="round"
                        transform="translate(100 60)"
                      >
                        <circle r="38" stroke="#283149" />
                        <circle
                          r="38"
                          stroke="#c9a66b"
                          stroke-dasharray="168 239"
                          transform="rotate(-90)"
                        />
                        <circle r="27" stroke="#283149" />
                        <circle
                          r="27"
                          stroke="#5f9e88"
                          stroke-dasharray="110 170"
                          transform="rotate(-90)"
                        />
                        <circle r="16" stroke="#283149" />
                        <circle
                          r="16"
                          stroke="#6cb4d6"
                          stroke-dasharray="58 101"
                          transform="rotate(-90)"
                        />
                      </g>
                    </svg>
                  }
                }
              </div>
              <h3 class="proyecto__nombre">{{ x.nombre }}</h3>
              <p class="proyecto__repo">{{ x.repo }}</p>
              <p class="proyecto__texto">{{ x.texto }}</p>
              <ul class="proyecto__datos">
                @for (d of x.datos; track $index) {
                  <li>{{ d }}</li>
                }
              </ul>
            </li>
          }
        </ul>
        <p class="nota">{{ p.nota }}</p>
      </div>
    </section>
  `,
  styleUrl: './proyectos.scss',
})
export class Proyectos {
  protected readonly i18n = inject(Idioma);
  protected readonly casillas = Array.from({ length: 64 }, (_, i) => {
    const col = i % 8;
    const fila = Math.floor(i / 8);
    return { x: col * 12, y: fila * 12, oscura: (col + fila) % 2 === 1 };
  });
}
