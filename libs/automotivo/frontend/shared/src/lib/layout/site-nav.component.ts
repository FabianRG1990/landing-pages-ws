import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AutomotivoStore, ScreenId } from '../core';

/**
 * NAVBAR — transcripción fiel del original: barra "swoosh" anclada arriba-centro
 * que, al hacer scroll (>46px), se colapsa en una pestaña; al desplegarla vuelve
 * la barra completa. Incluye el botón "Agendar cita".
 */
@Component({
  selector: 'amv-site-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-nav.component.html',
  styleUrl: './site-nav.component.scss',
})
export class SiteNavComponent {
  private readonly store = inject(AutomotivoStore);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly screen = this.store.screen;
  /** true cuando el usuario bajó (>46px) y la barra se contrae a una pestaña */
  readonly navScrolled = signal(false);
  /** cuando está contraída, si el usuario la desplegó con la pestaña */
  readonly navOpen = signal(false);

  readonly navItems2: { id: ScreenId; label: string }[] = [
    { id: 'galeria', label: 'Galería' },
    { id: 'nosotros', label: 'Nosotros' },
    { id: 'contacto', label: 'Contacto' },
  ];

  private readonly barShown = computed(() => !this.navScrolled() || this.navOpen());
  private readonly collapsed = computed(() => this.navScrolled() && !this.navOpen());

  readonly navStyle = 'position:fixed;top:0;left:0;right:0;height:86px;z-index:1000;pointer-events:none';
  readonly navWrapStyle = 'position:absolute;left:50%;top:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;pointer-events:none';

  readonly navBarStyle = computed(() => {
    const b = this.barShown();
    return 'display:flex;align-items:stretch;height:58px;transform:' + (b ? 'translateY(0)' : 'translateY(-104%)') +
      ';opacity:' + (b ? 1 : 0) + ';transition:transform .55s cubic-bezier(.16,1,.3,1),opacity .35s ease;pointer-events:' +
      (b ? 'auto' : 'none') + ';will-change:transform,opacity;filter:drop-shadow(0 14px 34px rgba(0,0,0,.4))';
  });
  readonly navTabStyle = computed(() => {
    const c = this.collapsed();
    return 'position:absolute;top:0;transform:' + (c ? 'translateY(0)' : 'translateY(-150%)') +
      ';opacity:' + (c ? 1 : 0) + ';transition:transform .55s cubic-bezier(.16,1,.3,1),opacity .3s ease;pointer-events:' +
      (c ? 'auto' : 'none') + ';will-change:transform,opacity';
  });
  readonly navLogoStyle = computed(() => {
    const b = this.barShown();
    return 'position:absolute;left:clamp(20px,4vw,54px);top:23px;display:flex;align-items:center;padding:0;pointer-events:' +
      (b ? 'auto' : 'none') + ';transform:' + (b ? 'translateY(0)' : 'translateY(-140%)') + ';opacity:' + (b ? 1 : 0) +
      ';transition:transform .55s cubic-bezier(.16,1,.3,1),opacity .35s ease;will-change:transform,opacity';
  });

  linkBase(active: boolean): string {
    return "pointer-events:auto;position:relative;display:flex;align-items:center;padding:0 13px;font-family:'Manrope',sans-serif;font-weight:600;font-size:13px;letter-spacing:.01em;white-space:nowrap;color:" +
      (active ? '#FFFFFF' : 'rgba(238,240,243,.66)') + ';background:transparent;transition:color .28s';
  }
  indStyle(active: boolean): string {
    return active
      ? 'position:absolute;left:12px;right:12px;bottom:4px;height:1.5px;border-radius:2px;background:linear-gradient(90deg,transparent,#FF3B41 20%,#fff 50%,#FF3B41 80%,transparent);animation:amv-tail 3.2s ease-in-out infinite;pointer-events:none'
      : 'display:none';
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!this.isBrowser) return;
    const sc = window.scrollY > 46;
    if (sc !== this.navScrolled()) { this.navScrolled.set(sc); this.navOpen.set(false); }
    else if (sc && this.navOpen()) { this.navOpen.set(false); }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.navOpen()) {
      const w = this.host.nativeElement.querySelector('.amv-nav-wrap');
      if (w && !w.contains(e.target as Node)) this.navOpen.set(false);
    }
  }

  go(id: ScreenId): void { this.store.go(id); this.navOpen.set(false); }
  goHome(): void { this.store.go('inicio'); }
  toggleNavOpen(e: Event): void { e.stopPropagation(); this.navOpen.update((v) => !v); }
  toggleMenu(): void { this.store.toggleMobileMenu(); }
}
