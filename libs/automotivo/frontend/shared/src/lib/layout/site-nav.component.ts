import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { AutomotivoStore, ScreenId } from '../core';
import { NAV } from '../data';

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

  readonly items = NAV;
  readonly screen = this.store.screen;
  readonly menuOpen = this.store.menuOpen;

  /** true cuando el usuario ha bajado y la barra se contrae a una pestaña */
  readonly scrolled = signal(false);
  /** cuando está contraída, si el usuario la desplegó con click */
  readonly expanded = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    const s = window.scrollY > 120;
    this.scrolled.set(s);
    if (!s) this.expanded.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.expanded() && !this.host.nativeElement.contains(e.target as Node)) {
      this.expanded.set(false);
    }
  }

  /** ¿la barra completa está visible? (en el tope, o desplegada manualmente) */
  get open(): boolean {
    return !this.scrolled() || this.expanded();
  }

  toggleTab(e: Event): void {
    e.stopPropagation();
    this.expanded.update((v) => !v);
  }

  go(id: ScreenId): void {
    this.store.go(id);
    this.expanded.set(false);
  }

  toggleMenu(): void {
    this.store.toggleMobileMenu();
  }
}
