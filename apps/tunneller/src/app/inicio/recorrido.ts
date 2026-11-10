import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { Idioma } from '../i18n/idioma';
import { Metal } from '../metal/metal';
import { Pantalla } from '../producto/pantalla';
import { Ventana } from '../producto/ventana';
import { Titular } from './titular';

/**
 * El recorrido en cinco etapas. En escritorio el texto baja con el scroll
 * normal y la ventana de la app se queda fija a la derecha: cambia de
 * escena cuando una etapa cruza el centro de la pantalla. No se secuestra
 * el scroll: se lee a la velocidad de cada quien.
 *
 * En móvil no cabe una ventana fija: cada etapa lleva su escena debajo, y
 * la escena se anima al asomar.
 */
@Component({
  selector: 'app-recorrido',
  imports: [Titular, Metal, Ventana, Pantalla],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let r = i18n.t().recorrido;
    <section class="seccion" id="recorrido" data-seccion="recorrido">
      <div class="contenedor">
        <header class="cabeza-seccion">
          <p class="etiqueta" data-r style="--i: 0">{{ r.etiqueta }}</p>
          <h2 class="titulo" data-r style="--i: 1">
            <app-titular [linea]="r.titulo" />
          </h2>
          <p class="lead" data-r style="--i: 2">{{ r.lead }}</p>
        </header>

        <div class="recorrido">
          <ol class="etapas">
            @for (e of r.etapas; track $index; let i = $index) {
              <li
                class="etapa"
                [class.etapa--actual]="actual() === i"
                [attr.data-etapa]="i"
              >
                <p class="etapa__num">
                  <span>0{{ i + 1 }}</span
                  >{{ e.nombre }}
                </p>
                <h3 class="etapa__titulo">{{ e.titulo }}</h3>
                <p class="etapa__texto">{{ e.texto }}</p>
                <div class="etapa__escena" aria-hidden="true">
                  <div class="app">
                    <app-pantalla [etapa]="i" [activa]="vistas()[i]" />
                  </div>
                </div>
              </li>
            }
          </ol>

          <div class="recorrido__fijo" aria-hidden="true">
            <div class="marco-metal">
              <app-metal [marco]="10" [radio]="12" />
              <div class="marco-metal__pantalla">
                <app-ventana [etapa]="actual()" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styleUrl: './recorrido.scss',
})
export class Recorrido {
  protected readonly i18n = inject(Idioma);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly actual = signal(0);
  /** En móvil: qué escenas ya asomaron (se animan una vez). */
  protected readonly vistas = signal<readonly boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);

  constructor() {
    const destruir = inject(DestroyRef);
    afterNextRender(() => {
      const etapas = Array.from(
        this.host.nativeElement.querySelectorAll<HTMLElement>('[data-etapa]'),
      );
      // Una franja fina en el centro de la pantalla: la etapa que la cruza
      // es la actual. Al subir, vuelve la anterior.
      const centro = new IntersectionObserver(
        (entradas) => {
          for (const e of entradas) {
            if (!e.isIntersecting) continue;
            this.actual.set(Number((e.target as HTMLElement).dataset['etapa']));
          }
        },
        { rootMargin: '-48% 0px -48% 0px', threshold: 0 },
      );
      const asomo = new IntersectionObserver(
        (entradas) => {
          for (const e of entradas) {
            if (!e.isIntersecting) continue;
            const i = Number((e.target as HTMLElement).dataset['etapa']);
            this.vistas.update((v) => v.map((x, j) => x || j === i));
            asomo.unobserve(e.target);
          }
        },
        { rootMargin: '0px 0px -25% 0px', threshold: 0 },
      );
      for (const e of etapas) {
        centro.observe(e);
        asomo.observe(e);
      }
      destruir.onDestroy(() => {
        centro.disconnect();
        asomo.disconnect();
      });
    });
  }
}
