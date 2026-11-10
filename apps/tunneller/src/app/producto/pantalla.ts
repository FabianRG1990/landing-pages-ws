import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { Idioma } from '../i18n/idioma';

// Posición de cada nodo del Canvas, en % del área: centro horizontal y
// borde superior. Es el grafo real de la Ruleta: proyecto → especificación
// → lista → (recordar | rueda) → girar.
const NODOS = [
  { x: 50, y: 2, estado: 'curso' },
  { x: 50, y: 22, estado: 'hecho' },
  { x: 50, y: 42, estado: 'libre' },
  { x: 25, y: 64, estado: 'bloqueado' },
  { x: 75, y: 64, estado: 'bloqueado' },
  { x: 75, y: 84, estado: 'bloqueado' },
] as const;

// Aristas en coordenadas del área (0..100), de la base de un nodo a la
// cima del siguiente.
const ARISTAS = [
  'M50 15 L50 22',
  'M50 35 L50 42',
  'M50 55 C50 60 25 59 25 64',
  'M50 55 C50 60 75 59 75 64',
  'M75 77 L75 84',
] as const;

const LETRAS = 'abc';

/**
 * Una escena de la app para cada etapa del recorrido. Su contenido entra
 * escalonado cuando la escena se activa ([data-p] con --d), y queda así.
 */
@Component({
  selector: 'app-pantalla',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pantalla', '[class.activa]': 'activa()' },
  template: `
    @let a = i18n.t().app;
    @let p = i18n.t().pantallas;
    @switch (etapa()) {
      @case (0) {
        <div class="p-hilo">
          <div class="p-tu" data-p style="--d: 0">
            <span class="p-quien">{{ p.destino.tu }}</span>
            <p class="p-burbuja">{{ a.idea }}</p>
          </div>
          <p class="p-ia" data-p style="--d: 1">{{ p.destino.intro }}</p>
          @for (q of p.destino.preguntas; track $index; let j = $index) {
            <div class="p-pregunta" data-p [style.--d]="2 + j * 2">
              <p class="p-pregunta__q">
                <b>Q{{ j + 1 }}</b> {{ q.pregunta }}
              </p>
              <ol class="p-opciones">
                @for (o of q.opciones; track $index; let k = $index) {
                  <li [class.elegida]="k === j">({{ letras[k] }}) {{ o }}</li>
                }
              </ol>
              <p class="p-reco" data-p [style.--d]="3 + j * 2">
                <span class="p-flecha" aria-hidden="true">→</span
                >{{ q.recomendacion }}
              </p>
            </div>
          }
        </div>
      }
      @case (1) {
        <div class="p-hilo">
          <p class="p-ia" data-p style="--d: 0">{{ p.especificacion.intro }}</p>
          <ul class="p-puntos">
            @for (x of p.especificacion.puntos; track $index) {
              <li data-p [style.--d]="1 + $index">{{ x }}</li>
            }
          </ul>
          <div class="p-decision" data-p style="--d: 4">
            <p>{{ p.especificacion.decisiones }}</p>
            <p class="p-revertir">{{ p.especificacion.revertir }}</p>
          </div>
          <div class="p-revision" data-p style="--d: 5">
            <p class="p-revision__t">{{ p.especificacion.revision }}</p>
            <div class="p-botones">
              <span class="p-boton p-boton--aprobar"
                >✓ {{ p.especificacion.aprobar }}</span
              >
              <span class="p-boton">{{ p.especificacion.cambios }}</span>
              <span class="p-boton p-boton--detener">{{
                p.especificacion.detener
              }}</span>
            </div>
          </div>
        </div>
      }
      @case (2) {
        <div class="p-canvas">
          <svg
            class="p-aristas"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            @for (d of aristas; track $index) {
              <path [attr.d]="d" pathLength="1" [style.--d]="1 + $index" />
            }
          </svg>
          @for (n of p.canvas.nodos; track n.numero; let i = $index) {
            @let pos = nodos[i];
            <div
              data-p
              [class]="'p-nodo p-nodo--' + pos.estado"
              [style.left.%]="pos.x"
              [style.top.%]="pos.y"
              [style.--d]="i"
            >
              <span class="p-nodo__tipo">{{ n.numero }} · {{ n.tipo }}</span>
              <span class="p-nodo__titulo">{{ n.titulo }}</span>
              <span class="p-nodo__estado">
                {{
                  pos.estado === 'hecho'
                    ? a.hecho
                    : pos.estado === 'bloqueado'
                      ? p.canvas.bloqueado
                      : pos.estado === 'curso'
                        ? a.enCurso
                        : a.pendiente
                }}
              </span>
            </div>
          }
        </div>
      }
      @case (3) {
        <div class="p-consola">
          @for (l of p.consola.lineas; track $index; let j = $index) {
            <p class="p-linea" data-p [style.--d]="j">
              <span
                class="p-punto"
                [class.p-punto--rojo]="j === 0"
                aria-hidden="true"
              ></span
              >{{ l }}
            </p>
          }
          <p class="p-pruebas" data-p style="--d: 4">
            <span class="p-check" aria-hidden="true">✓</span
            ><code>{{ p.consola.pruebas }}</code>
          </p>
          <div class="p-progreso" data-p style="--d: 5">
            <span>{{ p.consola.progreso }}</span>
            <span class="p-barra"><i></i></span>
            <span>4/4</span>
          </div>
        </div>
      }
      @case (4) {
        <div class="p-entrega">
          <div class="p-pr" data-p style="--d: 0">
            <p class="p-pr__titulo">
              <span class="p-pr__abierto">Open</span>{{ p.entrega.pr }}
              <span class="p-pr__num">#7</span>
            </p>
            <p class="p-pr__fila">
              <span class="p-check" aria-hidden="true">✓</span
              ><span
                ><b>{{ p.entrega.checks }}</b
                ><small>{{ p.entrega.checksTexto }}</small></span
              >
            </p>
            <p class="p-pr__fila">
              <span class="p-check" aria-hidden="true">✓</span
              >{{ p.entrega.conflictos }}
            </p>
            <p class="p-pr__fila p-pr__fila--vista">
              <span class="p-check" aria-hidden="true">✓</span
              >{{ p.entrega.vista }}
            </p>
          </div>
          <div class="p-demo" data-p style="--d: 2">
            <p class="p-demo__titulo">{{ p.entrega.ruleta }}</p>
            <div class="p-demo__cuerpo">
              <svg class="p-rueda" viewBox="-50 -50 100 100" aria-hidden="true">
                <g class="p-rueda__giro">
                  <path
                    d="M0 0 L0 -46 A46 46 0 0 1 39.84 23 Z"
                    fill="#c98a5e"
                  />
                  <path
                    d="M0 0 L39.84 23 A46 46 0 0 1 -39.84 23 Z"
                    fill="#5f9e88"
                  />
                  <path
                    d="M0 0 L-39.84 23 A46 46 0 0 1 0 -46 Z"
                    fill="#8a7fb8"
                  />
                  <circle r="5" fill="#f4f3ef" />
                </g>
                <path d="M-4 -49 L4 -49 L0 -41 Z" fill="#17181b" />
              </svg>
              <ul class="p-demo__opciones">
                @for (o of p.entrega.opciones; track $index) {
                  <li>{{ o }}</li>
                }
                <li class="p-demo__girar">{{ p.entrega.girar }}</li>
              </ul>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class Pantalla {
  protected readonly i18n = inject(Idioma);
  protected readonly nodos = NODOS;
  protected readonly aristas = ARISTAS;
  protected readonly letras = LETRAS;
  readonly etapa = input(0);
  readonly activa = input(false);
}
