import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  phosphorList,
  phosphorX,
} from '@ng-icons/phosphor-icons/regular';
import { filter, map, startWith } from 'rxjs/operators';

import { EmblemMark } from '../../../ui/brand-mark/emblem-mark';
import { GlassPillCanvas } from '../glass-pill-canvas/glass-pill-canvas';

interface NavLink {
  readonly href: string;
  readonly label: string;
}

const LINKS: ReadonlyArray<NavLink> = [
  { href: '/', label: 'Inicio' },
  { href: '/exhibiciones', label: 'Exhibiciones' },
  { href: '/especies', label: 'Galería' },
  { href: '/contacto', label: 'Contáctenos' },
];

/**
 * FloatingNav — header flotante con:
 *  - Brand (emblema + wordmark)
 *  - Pill desktop con `<app-glass-pill-canvas>` Three.js detrás de los links
 *  - Indicador del link activo (fade-in via clase, sustituye `layoutId`)
 *  - Burger + bottom-sheet móvil con stagger en los items
 *  - Cursor spotlight escrito como CSS vars (`--mx`, `--my`, `--m-opacity`)
 *  - Detección de scroll (>24 px → escala 0.97 + glass-shell-scrolled)
 *  - Cierre automático del menú al cambiar de ruta
 *  - Body scroll lock cuando el menú móvil está abierto
 */
@Component({
  selector: 'app-floating-nav',
  imports: [RouterLink, NgIcon, EmblemMark, GlassPillCanvas],
  providers: [provideIcons({ phosphorList, phosphorX })],
  templateUrl: './floating-nav.html',
  styleUrl: './floating-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingNav {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly links = LINKS;
  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);

  private readonly navRef =
    viewChild<ElementRef<HTMLElement>>('navRef');

  /** URL actual reactiva — sustituto Angular del `usePathname` de Next. */
  protected readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected isActive(link: NavLink): boolean {
    const url = this.currentUrl();
    return link.href === '/' ? url === '/' : url.startsWith(link.href);
  }

  constructor() {
    // Cursor spotlight — escribe variables CSS sobre el pill directamente,
    // sin re-renders. El estilo del spotlight (`::after`) lo hidrata el CSS
    // del design system (variables consumidas por `.glass-nav` aunque aquí
    // no estén activadas; el patrón se conserva por paridad con el origen).
    afterNextRender(() => {
      const navEl = this.navRef()?.nativeElement;
      if (!navEl) return;

      const onMove = (e: PointerEvent): void => {
        const rect = navEl.getBoundingClientRect();
        navEl.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        navEl.style.setProperty('--my', `${e.clientY - rect.top}px`);
      };
      const onEnter = (): void => {
        navEl.style.setProperty('--m-opacity', '1');
      };
      const onLeave = (): void => {
        navEl.style.setProperty('--m-opacity', '0');
      };

      navEl.addEventListener('pointermove', onMove);
      navEl.addEventListener('pointerenter', onEnter);
      navEl.addEventListener('pointerleave', onLeave);

      this.destroyRef.onDestroy(() => {
        navEl.removeEventListener('pointermove', onMove);
        navEl.removeEventListener('pointerenter', onEnter);
        navEl.removeEventListener('pointerleave', onLeave);
      });
    });

    // Body scroll lock cuando el menú móvil está abierto.
    effect(() => {
      if (!this.isBrowser) return;
      document.body.style.overflow = this.menuOpen() ? 'hidden' : '';
    });

    this.destroyRef.onDestroy(() => {
      if (this.isBrowser) document.body.style.overflow = '';
    });

    // Cierre automático del menú al cambiar de ruta.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.menuOpen.set(false));
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    if (!this.isBrowser) return;
    this.scrolled.set(window.scrollY > 24);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }
}
