import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  NgZone,
  PLATFORM_ID,
  afterNextRender,
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
 * Navbar flotante + menú móvil. Equivale al `<nav>` y al menú móvil del original,
 * con el estado `scrolled` (cápsula glass al hacer scroll) y `menuOpen`
 * (body.menu-open ↔ hamburguesa morph).
 *
 * El scroll se escucha FUERA de la zona de Angular y con throttle por rAF, y
 * solo re-entra a la zona cuando `scrolled` realmente cambia (al cruzar el
 * umbral), así no dispara detección de cambios en cada evento.
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
  private readonly zone = inject(NgZone);

  constructor() {
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      document.body.classList.toggle('menu-open', this.menuOpen());
    });

    const sub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.menuOpen.set(false));
    this.destroyRef.onDestroy(() => {
      sub.unsubscribe();
      if (isPlatformBrowser(this.platformId)) {
        document.body.classList.remove('menu-open');
      }
    });

    afterNextRender(() => {
      let ticking = false;
      this.zone.runOutsideAngular(() => {
        const onScroll = () => {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(() => {
            const next = window.scrollY > 50;
            if (next !== this.scrolled()) {
              this.zone.run(() => this.scrolled.set(next));
            }
            ticking = false;
          });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        this.destroyRef.onDestroy(() =>
          window.removeEventListener('scroll', onScroll),
        );
      });
    });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
