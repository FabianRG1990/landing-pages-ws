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
// Los nodos solos en su fila son anchos: así su título cabe en una línea.
const NODOS = [
  { x: 50, y: 2, estado: 'curso', ancho: true },
  { x: 50, y: 21, estado: 'hecho', ancho: true },
  { x: 50, y: 40, estado: 'libre', ancho: true },
  { x: 25, y: 60, estado: 'bloqueado', ancho: false },
  { x: 75, y: 60, estado: 'bloqueado', ancho: false },
  { x: 75, y: 80, estado: 'bloqueado', ancho: false },
] as const;

// Aristas en coordenadas del área (0..100), de dentro de un nodo a la
// cima del siguiente: el alto del nodo depende de la letra, así que la
// arista nace tapada por él (las tarjetas son opacas).
const ARISTAS = [
  'M50 10 L50 21',
  'M50 29 L50 40',
  'M50 48 C50 55 25 54 25 60',
  'M50 48 C50 55 75 54 75 60',
  'M75 68 L75 80',
] as const;

const LETRAS = 'abc';

// La entrega es el ajedrez: unas piezas en su sitio y la dama blanca, que
// sale de d1 a h5 y da jaque al rey negro por la diagonal. Columna y fila
// en casillas desde arriba a la izquierda (a8). Se usan las figuras rellenas
// para los dos bandos (el color va por CSS) y el selector de texto U+FE0E,
// para que ningún sistema las pinte como emoji.
const T = '︎';
const PIEZAS = [
  { g: '♜' + T, x: 0, y: 0, lado: 'negra' },
  { g: '♝' + T, x: 2, y: 0, lado: 'negra' },
  { g: '♚' + T, x: 4, y: 0, lado: 'negra' },
  { g: '♞' + T, x: 6, y: 0, lado: 'negra' },
  { g: '♜' + T, x: 0, y: 7, lado: 'blanca' },
  { g: '♝' + T, x: 2, y: 7, lado: 'blanca' },
  { g: '♚' + T, x: 4, y: 7, lado: 'blanca' },
] as const;
const DAMA = '♛' + T;

const CASILLAS = Array.from({ length: 64 }, (_, i) => {
  const col = i % 8;
  const fila = Math.floor(i / 8);
  return { x: col * 12, y: fila * 12, oscura: (col + fila) % 2 === 1 };
});

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
              [class.p-nodo--ancho]="pos.ancho"
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
              <span class="p-pr__num">#29</span>
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
            <p class="p-demo__titulo">{{ p.entrega.app }}</p>
            <div class="p-demo__cuerpo">
              <svg class="p-tablero" viewBox="0 0 96 96" aria-hidden="true">
                @for (c of casillas; track $index) {
                  <rect
                    [attr.x]="c.x"
                    [attr.y]="c.y"
                    width="12"
                    height="12"
                    [attr.fill]="c.oscura ? '#8c6c3b' : '#ecdcbc'"
                  />
                }
                <rect class="p-tablero__jaque" x="48" y="0" width="12" height="12" />
                @for (f of piezas; track $index) {
                  <text
                    [class]="'p-pieza p-pieza--' + f.lado"
                    [attr.x]="f.x * 12 + 6"
                    [attr.y]="f.y * 12 + 6.6"
                    >{{ f.g }}</text
                  >
                }
                <text class="p-pieza p-pieza--blanca p-pieza--dama" x="42" y="90.6">{{
                  dama
                }}</text>
              </svg>
              <ul class="p-demo__opciones">
                @for (o of p.entrega.opciones; track $index) {
                  <li>{{ o }}</li>
                }
                <li class="p-demo__boton">{{ p.entrega.boton }}</li>
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
  protected readonly casillas = CASILLAS;
  protected readonly piezas = PIEZAS;
  protected readonly dama = DAMA;
  readonly etapa = input(0);
  readonly activa = input(false);
}
