import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NAV_LINKS } from '../../data/site';

/**
 * Barra de navegación fija con glass al hacer scroll y menú móvil de cortina.
 * Equivale al componente `Nav` del index.html original (estado `scrolled` por
 * scroll y `open` para el menú móvil).
 */
@Component({
  selector: 'app-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nav.html',
})
export class Nav {
  protected readonly links = NAV_LINKS;
  protected readonly scrolled = signal(false);
  protected readonly open = signal(false);

  private readonly platformId = inject(PLATFORM_ID);

  @HostListener('window:scroll')
  protected onScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.scrolled.set(window.scrollY > 30);
  }

  protected toggle(): void {
    this.open.update((v) => !v);
  }

  protected close(): void {
    this.open.set(false);
  }
}
