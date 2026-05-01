import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLockup } from '../../ui/brand-mark/brand-lockup';

interface NavLink {
  readonly label: string;
  readonly href: string;
}

/**
 * Footer — pieza inferior fija del shell. Contiene la marca completa
 * (BrandLockup), tagline editorial, columna de navegación secundaria y la
 * barra legal con copyright + enlaces meta.
 */
@Component({
  selector: 'app-footer',
  imports: [RouterLink, BrandLockup],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly currentYear = new Date().getFullYear();

  protected readonly navLinks: readonly NavLink[] = [
    { label: 'Exhibiciones', href: '/exhibiciones' },
    { label: 'Galería', href: '/especies' },
    { label: 'Conservación', href: '/especies' },
    { label: 'Investigación', href: '/especies' },
    { label: 'Noche bioluminiscente', href: '/exhibiciones' },
  ];

  protected readonly metaItems: readonly string[] = [
    'Aviso legal',
    'Privacidad',
    'Sostenibilidad',
    'Prensa',
  ];
}
