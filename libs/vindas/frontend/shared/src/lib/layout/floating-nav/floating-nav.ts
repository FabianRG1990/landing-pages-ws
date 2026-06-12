import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { I18n } from '../../i18n/i18n.service';
import { NAV_ITEMS, whatsappHref } from '../../data/site';

/**
 * Barra fija + menú móvil. Equivale al <header class="nav"> y al <div class="mobile">
 * originales: estado `scrolled` (fondo al hacer scroll), `menuOpen` (menú móvil),
 * toggle de idioma ES/EN y CTA de WhatsApp con el texto pre-cargado por idioma.
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

  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly waHref = computed(() => whatsappHref(this.i18n.t().waText));
  protected readonly langLabel = computed(() => (this.i18n.lang() === 'es' ? 'EN' : 'ES'));

  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const sub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.menuOpen.set(false));
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.scrolled.set(window.scrollY > 26);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected toggleLang(): void {
    this.i18n.toggle();
  }
}
