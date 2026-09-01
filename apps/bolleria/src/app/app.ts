import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  effect,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  BolleriaStore,
  CartDrawerComponent,
  CheckoutDialogComponent,
  CurtainComponent,
  PreloaderComponent,
  SiteFooterComponent,
  SiteNavComponent,
  installScrollLock,
  // DIAG — temporal, ver diag.ts.
  instalaDiag,
} from '@bolleria-ui-shared';
import { EntremesComponent, HeroScrollComponent, HomeComponent } from '@bolleria-ui-inicio';
import { MenuPageComponent } from '@bolleria-ui-menu';
import { ContactPageComponent } from '@bolleria-ui-contacto';

@Component({
  selector: 'bol-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PreloaderComponent,
    CurtainComponent,
    SiteNavComponent,
    SiteFooterComponent,
    CartDrawerComponent,
    CheckoutDialogComponent,
    HeroScrollComponent,
    EntremesComponent,
    HomeComponent,
    MenuPageComponent,
    ContactPageComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly store = inject(BolleriaStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private revealedOnLoad = false;

  constructor() {
    if (this.isBrowser) {
      installScrollLock(() => this.store.scrollLocked());
      // DIAG — no hace nada sin `?diag=1` en la URL.
      instalaDiag();
    }
    // Reveal-on-load inicial (transcripción fiel de `playReveal()` tras el preloader).
    effect(() => {
      if (this.store.loaded() && this.isBrowser && !this.revealedOnLoad) {
        this.revealedOnLoad = true;
        this.revealScan();
      }
    });
    // Reveal tras cada cambio de pantalla (mismo `playReveal()`, disparado por `go()`).
    effect(() => {
      this.store.settleTick();
      if (this.isBrowser && this.revealedOnLoad) {
        setTimeout(() => this.revealScan(), 60);
      }
    });
  }

  /** Stagger de aparición para los elementos `[data-rv]` de la pantalla actual — port de `playReveal`. */
  private revealScan(): void {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-rv]'));
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduced) {
      els.forEach((e) => {
        e.style.opacity = '1';
        e.style.transform = 'none';
      });
      return;
    }
    els.forEach((e) => {
      e.style.transition = 'none';
      e.style.opacity = '0';
      e.style.transform = 'translateY(24px)';
    });
    void document.body.offsetWidth;
    els.forEach((e, i) => {
      const d = Math.min(i * 65, 520);
      setTimeout(() => {
        e.style.transition = 'opacity .7s ease, transform .75s cubic-bezier(.2,.75,.2,1)';
        e.style.opacity = '1';
        e.style.transform = 'none';
      }, d);
    });
    setTimeout(
      () =>
        els.forEach((e) => {
          e.style.opacity = '1';
          e.style.transform = 'none';
        }),
      1500,
    );
  }
}
