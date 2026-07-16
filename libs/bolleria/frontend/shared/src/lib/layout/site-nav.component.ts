import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BolleriaStore } from '../core/bolleria.store';
import { ScreenId } from '../core/models';

/** Navbar + menú móvil — transcripción fiel del original. */
@Component({
  selector: 'bol-site-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-nav.component.html',
  styleUrl: './site-nav.component.scss',
})
export class SiteNavComponent {
  private readonly store = inject(BolleriaStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly screen = this.store.screen;
  readonly mobileOpen = this.store.mobileOpen;
  readonly cartCount = this.store.cartCount;
  readonly scrolled = signal(false);

  constructor() {
    if (this.isBrowser) {
      afterNextRender(() => {
        const onScroll = () => this.scrolled.set(window.scrollY > 30);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
      });
    }
  }

  go(screen: ScreenId): void {
    this.store.go(screen);
  }

  goMenuCategory(cat: string): void {
    this.store.go('menu', cat);
  }

  openCart(): void {
    this.store.openCart();
  }

  toggleMobile(): void {
    this.store.toggleMobileMenu();
  }

  closeMobile(): void {
    this.store.closeMobileMenu();
  }
}
