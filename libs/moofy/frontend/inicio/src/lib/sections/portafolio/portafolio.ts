import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PORTAFOLIO } from '@moofy-ui-shared/data/site';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';

/**
 * Franja de portafolio. Moofy es la casa; Pan José y Panrico aparecen,
 * pero con menos peso que cualquier capítulo: texto, sin logos ni fotos.
 */
@Component({
  selector: 'app-portafolio',
  imports: [RevelarDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="portafolio" aria-label="Portafolio de marcas">
      <div class="portafolio__shell shell" appRevelar>
        <p class="portafolio__casa">{{ p.titulo }}</p>
        <div class="portafolio__otras">
          <p class="mono">{{ p.etiqueta }}</p>
          <ul>
            @for (m of p.marcas; track m) {
              <li>{{ m }}</li>
            }
          </ul>
        </div>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .portafolio__shell {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem var(--gutter);
      padding-block: clamp(2rem, 1.5rem + 2vw, 3rem);
      border-block: 1px solid var(--line-soft);
    }

    .portafolio__casa {
      font-family: var(--font-display);
      font-size: var(--fs-h3);
      font-variation-settings: 'SOFT' 50;
    }

    .portafolio__otras {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.75rem 1.5rem;

      ul {
        display: flex;
        gap: 1.5rem;
      }

      li {
        font-weight: var(--w-emph);
        color: var(--crema-2);

        & + li {
          padding-left: 1.5rem;
          border-left: 1px solid var(--line);
        }
      }
    }
  `,
})
export class PortafolioComponent {
  protected readonly p = PORTAFOLIO;
}
