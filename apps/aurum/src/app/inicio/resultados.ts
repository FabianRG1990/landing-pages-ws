import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Idioma } from '../i18n/idioma';
import { Titular } from './titular';

const DURACION_MS = 1700;
const salidaExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Resultados: las cifras cuentan hasta su valor una sola vez, cuando la
 * sección entra. En el HTML prerenderizado ya están en su valor final:
 * sin JS o con movimiento reducido se ven tal cual.
 */
@Component({
  selector: 'app-resultados',
  imports: [Titular],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let t = i18n.t().resultados;
    <section
      id="resultados"
      class="seccion"
      data-seccion="resultados"
      data-tema="claro"
      aria-labelledby="resultados-titulo"
    >
      <div class="contenedor resultados">
        <header class="resultados__cabeza" data-calma data-foco>
          <p class="etiqueta" data-r style="--i: 0">{{ t.etiqueta }}</p>
          <h2 id="resultados-titulo" class="titulo resultados__titulo">
            <app-titular [lineas]="t.titulo" [desde]="1" />
          </h2>
          <p class="lead resultados__lead" data-r style="--i: 3">
            {{ t.lead }}
          </p>
        </header>

        <dl class="cifras" data-calma data-foco>
          @for (c of cifras(); track $index) {
            <div class="cifra" data-r [style.--i]="$index + 2">
              <dt class="cifra__texto">{{ c.texto }}</dt>
              <dd class="cifra__valor">
                <span class="cifra__numero" aria-hidden="true">{{
                  c.mostrado
                }}</span>
                <span class="solo-lector">{{ c.final }}</span>
              </dd>
            </div>
          }
        </dl>

        <figure class="cita" data-calma data-foco>
          <blockquote class="cita__texto" data-r style="--i: 1">
            <p>{{ t.cita.texto }}</p>
          </blockquote>
          <figcaption class="cita__autor" data-r style="--i: 2">
            <span>{{ t.cita.autor }}</span>
            <span class="cita__cargo">{{ t.cita.cargo }}</span>
          </figcaption>
        </figure>

        <p class="resultados__nota">{{ t.nota }}</p>
      </div>
    </section>
  `,
  styleUrl: './resultados.scss',
})
export class Resultados {
  protected readonly i18n = inject(Idioma);
  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly avance = signal(1);

  protected readonly cifras = computed(() => {
    const p = this.avance();
    return this.i18n.t().resultados.cifras.map((c) => {
      const formato = new Intl.NumberFormat(this.i18n.formato(), {
        minimumFractionDigits: c.decimales,
        maximumFractionDigits: c.decimales,
      });
      const fmt = (v: number) => formato.format(v) + c.sufijo;
      return {
        texto: c.texto,
        mostrado: fmt(c.valor * p),
        final: fmt(c.valor),
      };
    });
  });

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const win = this.anfitrion.nativeElement.ownerDocument.defaultView;
      if (!win || win.matchMedia('(prefers-reduced-motion: reduce)').matches)
        return;
      if (!('IntersectionObserver' in win)) return;
      const objetivo = this.anfitrion.nativeElement.querySelector('.cifras');
      if (!objetivo) return;
      this.avance.set(0);
      let marco = 0;
      const obs = new IntersectionObserver(
        ([e]) => {
          if (!e?.isIntersecting) return;
          obs.disconnect();
          const inicio = win.performance.now() + 250;
          const paso = (ahora: number) => {
            const t = Math.max(0, (ahora - inicio) / DURACION_MS);
            this.avance.set(salidaExpo(t));
            if (t < 1) marco = win.requestAnimationFrame(paso);
          };
          marco = win.requestAnimationFrame(paso);
        },
        { rootMargin: '0px 0px -22% 0px' },
      );
      obs.observe(objetivo);
      destroy.onDestroy(() => {
        obs.disconnect();
        win.cancelAnimationFrame(marco);
      });
    });
  }
}
