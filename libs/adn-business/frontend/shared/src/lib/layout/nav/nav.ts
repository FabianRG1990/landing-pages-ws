import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NAV, SITE } from '../../data/site';
import { IsotipoComponent } from '../../marca/isotipo';

/** Nav en celdas separadas por 1px: la tabla tecnica, no la pildora flotante. */
@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [IsotipoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip mono" href="#main">Ir al contenido</a>

    <header class="nav">
      <a class="nav__marca" href="/" [attr.aria-label]="site.marca">
        <app-isotipo class="nav__logo" />
        <span class="nav__nombre">
          ADN <em>Business</em>
        </span>
      </a>

      <nav class="nav__links" aria-label="Secciones">
        @for (item of nav; track item.ancla) {
          <a class="nav__link mono mono--ink" [href]="item.ancla">{{ item.etiqueta }}</a>
        }
      </nav>

      <a class="nav__cta mono" [href]="site.whatsapp" target="_blank" rel="noopener">
        Hablar con ADN
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </a>
    </header>
  `,
  styleUrl: './nav.scss',
})
export class NavComponent {
  protected readonly nav = NAV;
  protected readonly site = SITE;
}
