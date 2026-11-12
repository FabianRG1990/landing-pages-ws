import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { montarEscena } from '../escena/escena';
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
 * A la izquierda, un trazo une las etapas y se llena con el scroll; cada
 * etapa enciende su nodo al pasar.
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
    <section
      class="seccion seccion--oscura"
      id="recorrido"
      data-seccion="recorrido"
    >
      <div class="contenedor">
        <header class="cabeza-seccion">
          <p class="etiqueta">{{ r.etiqueta }}</p>
          <h2 class="titulo">
            <app-titular [linea]="r.titulo" />
          </h2>
          <p class="lead">{{ r.lead }}</p>
        </header>

        <div class="recorrido">
          <ol class="etapas">
            @for (e of r.etapas; track $index; let i = $index) {
              <li
                class="etapa"
                [class.etapa--actual]="actual() === i"
                [class.etapa--pasada]="actual() >= i"
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
            const i = Number((e.target as HTMLElement).dataset['etapa']);
            if (i === this.actual()) continue;
            this.actual.set(i);
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

      // El trazo de avance: se llena con el scroll entre la primera y la
      // última etapa. Sin movimiento queda lleno (--avance vale 1).
      const lista = this.host.nativeElement.querySelector<HTMLElement>('.etapas');
      if (!lista) return;
      montarEscena(destruir, () => {
        const poner = (p: number) => lista.style.setProperty('--avance', p.toFixed(4));
        const st = ScrollTrigger.create({
          trigger: lista,
          start: 'top 50%',
          end: 'bottom 50%',
          onUpdate: (s) => poner(s.progress),
        });
        poner(st.progress);
        return () => lista.style.removeProperty('--avance');
      });
    });
  }
}
