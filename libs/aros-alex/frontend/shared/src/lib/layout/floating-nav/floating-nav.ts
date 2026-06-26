import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  PLATFORM_ID,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter } from 'rxjs';
import { NAV_ITEMS } from '../../data/content';
import { COPY } from '../../data/copy';
import { LanguageStore } from '../../i18n/language.store';

/**
 * Navbar flotante + toggle de idioma + menú móvil de cortina. Equivale al
 * `<nav>` y `<div id="aa-menu">` originales: el estado `scrolled` (nav opaco al
 * hacer scroll), `onHero` (transparente en el tope del inicio) y `menuOpen`
 * (body.menu-open) son signals.
 */
@Component({
  selector: 'app-floating-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './floating-nav.html',
})
export class FloatingNav {
  protected readonly items = NAV_ITEMS;
  protected readonly copy = COPY;
  protected readonly L = inject(LanguageStore);

  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly onHero = signal(true);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.onHero.set(this.isHero(this.router.url));

    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      document.body.classList.toggle('menu-open', this.menuOpen());
    });

    const sub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.menuOpen.set(false);
        this.onHero.set(this.isHero((e as NavigationEnd).urlAfterRedirects));
      });
    this.destroyRef.onDestroy(() => {
      sub.unsubscribe();
      if (isPlatformBrowser(this.platformId)) {
        document.body.classList.remove('menu-open');
      }
    });
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.scrolled.set(window.scrollY > 24);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  private isHero(url: string): boolean {
    return url === '/' || url.startsWith('/inicio');
  }
}
