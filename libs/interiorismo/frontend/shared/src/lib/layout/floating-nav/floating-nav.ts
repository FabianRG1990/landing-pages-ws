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
import { NAV_ITEMS } from '../../data/nav';

/**
 * Navbar flotante + menú móvil. Equivale al `<header id="nav">` y al
 * `<div id="mobile-menu">` originales, con el estado `scrolled` (fondo glass al
 * hacer scroll) y `menuOpen` (body.menu-open ↔ hamburguesa morph).
 */
@Component({
  selector: 'app-floating-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './floating-nav.html',
})
export class FloatingNav {
  protected readonly items = NAV_ITEMS;
  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // body.menu-open ↔ menuOpen()
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      document.body.classList.toggle('menu-open', this.menuOpen());
    });

    // Cerrar el menú al navegar
    const sub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.menuOpen.set(false));
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
    this.scrolled.set(window.scrollY > 60);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
