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
  readonly menuOpen = this.store.menuOpen;
  /** true cuando el usuario bajó (>46px) y la barra se contrae a una pestaña */
  readonly navScrolled = signal(false);
  /** cuando está contraída, si el usuario la desplegó con la pestaña */
  readonly navOpen = signal(false);

  readonly navItems2: { id: ScreenId; label: string }[] = [
    { id: 'galeria', label: 'Galería' },
    { id: 'nosotros', label: 'Nosotros' },
    { id: 'contacto', label: 'Contacto' },
  ];
  readonly mobileItems: { id: ScreenId; label: string; num: string }[] = [
    { id: 'inicio', label: 'Inicio', num: '01' },
    { id: 'servicios', label: 'Servicios', num: '02' },
    { id: 'galeria', label: 'Galería', num: '03' },
    { id: 'nosotros', label: 'Nosotros', num: '04' },
    { id: 'contacto', label: 'Contacto', num: '05' },
  ];
  readonly mobileStyle = computed(() => {
    const o = this.menuOpen();
    return 'position:fixed;inset:0;z-index:1400;background:linear-gradient(160deg,#111114,#050506);display:flex;align-items:center;justify-content:center;padding:90px 30px;clip-path:' +
      (o ? 'circle(150% at 92% 5%)' : 'circle(0% at 92% 5%)') + ';transition:clip-path .6s cubic-bezier(.76,0,.24,1);pointer-events:' + (o ? 'auto' : 'none');
  });

  private readonly barShown = computed(() => !this.navScrolled() || this.navOpen());
  private readonly collapsed = computed(() => this.navScrolled() && !this.navOpen());

  readonly navStyle = 'position:fixed;top:0;left:0;right:0;height:86px;z-index:1000;pointer-events:none';
  // Centrado por márgenes automáticos (NO por translateX(-50%)): el transform de
  // centrado deja el texto en media-fracción de píxel y lo pone en una capa GPU →
  // borroso en DPR fraccional (escalado de Windows). Con auto-margins no hay capa.
  readonly navWrapStyle = 'position:absolute;left:0;right:0;top:0;margin:0 auto;width:max-content;display:flex;flex-direction:column;align-items:center;pointer-events:none';

  // En reposo usamos transform:none (sin will-change) para que el texto de la
  // barra se rasterice nítido: will-change + un transform identidad promueven la
  // capa y, en DPR fraccional (escalado de Windows), reescalan la textura → blur.
  // La animación de colapso sigue funcionando (none ↔ translateY interpolan).
  readonly navBarStyle = computed(() => {
    const b = this.barShown();
    return 'display:flex;align-items:stretch;height:58px;transform:' + (b ? 'none' : 'translateY(-104%)') +
      ';opacity:' + (b ? 1 : 0) + ';transition:transform .55s cubic-bezier(.16,1,.3,1),opacity .35s ease;pointer-events:' +
      (b ? 'auto' : 'none');
  });
  readonly navTabStyle = computed(() => {
    const c = this.collapsed();
    return 'position:absolute;top:0;transform:' + (c ? 'none' : 'translateY(-150%)') +
      ';opacity:' + (c ? 1 : 0) + ';transition:transform .55s cubic-bezier(.16,1,.3,1),opacity .3s ease;pointer-events:' +
      (c ? 'auto' : 'none');
  });
  readonly navLogoStyle = computed(() => {
    const b = this.barShown();
    return 'position:absolute;left:clamp(20px,4vw,54px);top:23px;display:flex;align-items:center;padding:0;pointer-events:' +
      (b ? 'auto' : 'none') + ';transform:' + (b ? 'none' : 'translateY(-140%)') + ';opacity:' + (b ? 1 : 0) +
      ';transition:transform .55s cubic-bezier(.16,1,.3,1),opacity .35s ease';
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
