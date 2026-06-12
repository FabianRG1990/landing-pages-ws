import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { NAV_LINKS } from '../../data/site';
import { LinkDirective } from '../../transition/link.directive';

/**
 * Barra de navegación fija con glass al hacer scroll y menú móvil de cortina.
 * Cada link navega a su segmento con la transición cinematográfica (`appLink`);
 * el segmento activo se resalta comparando con la URL actual.
 */
@Component({
  selector: 'app-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LinkDirective],
  templateUrl: './nav.html',
})
export class Nav {
  protected readonly links = NAV_LINKS;
  protected readonly scrolled = signal(false);
  protected readonly open = signal(false);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  /** URL actual (para resaltar el segmento activo). */
  protected readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected isActive(target: string): boolean {
    const url = this.currentUrl();
    return url === target || url.startsWith(target + '/');
  }

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
