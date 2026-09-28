import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NAV, SITE, enlaceWhatsapp } from '../../data/site';
import { LogoComponent } from '../../marca/logo';
import { SmoothScroll } from '../../motion/smooth-scroll.service';

/**
 * Barra fija. Transparente sobre el hero y sólida (con desenfoque) en
 * cuanto el hero deja de estar debajo: sobre la foto no debe haber una
 * franja opaca, y sobre el contenido no debe haber texto encima de texto.
 *
 * Por debajo de 900 px los enlaces pasan a un menú a pantalla completa,
 * que se comporta como un diálogo modal: atrapa el foco, se cierra con
 * Escape y devuelve el foco al botón que lo abrió.
 */
@Component({
  selector: 'app-nav',
  imports: [LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nav.html',
  styleUrl: './nav.scss',
  host: {
    '(document:keydown)': 'teclado($event)',
  },
})
export class NavComponent {
  private readonly smooth = inject(SmoothScroll);
  private readonly destroyRef = inject(DestroyRef);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly nav = NAV;
  protected readonly site = SITE;
  protected readonly whatsapp = enlaceWhatsapp(SITE.mensajeReunion);

  protected readonly solida = signal(false);
  protected readonly abierto = signal(false);

  private readonly boton = viewChild.required<ElementRef<HTMLButtonElement>>('boton');
  private readonly menu = viewChild.required<ElementRef<HTMLElement>>('menu');

  constructor() {
    afterNextRender(() => {
      if (!this.esNavegador) return;
      // Se vuelve sólida cuando el scroll pasa de un umbral pequeño: con
      // cero se enciende con el rebote elástico de iOS en la cima.
      const medir = () => this.solida.set(window.scrollY > 24);
      medir();
      window.addEventListener('scroll', medir, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', medir));
    });
  }

  protected ir(evento: Event, ancla: string): void {
    evento.preventDefault();
    this.cerrar(false);
    this.smooth.scrollTo(ancla);
  }

  protected alternar(): void {
    if (this.abierto()) {
      this.cerrar(true);
    } else {
      this.abierto.set(true);
      this.smooth.stop();
      document.documentElement.classList.add('menu-abierto');
      // El foco entra al menú en cuanto existe en pantalla.
      requestAnimationFrame(() => this.enfocables()[0]?.focus());
    }
  }

  protected cerrar(devolverFoco: boolean): void {
    if (!this.abierto()) return;
    this.abierto.set(false);
    this.smooth.start();
    document.documentElement.classList.remove('menu-abierto');
    if (devolverFoco) this.boton().nativeElement.focus();
  }

  protected teclado(e: KeyboardEvent): void {
    if (!this.abierto()) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.cerrar(true);
      return;
    }
    if (e.key !== 'Tab') return;

    // Trampa de foco: el ciclo incluye el botón de cerrar, que sigue
    // visible encima del menú.
    const ciclo = [this.boton().nativeElement, ...this.enfocables()];
    const i = ciclo.indexOf(document.activeElement as HTMLElement);
    const siguiente = e.shiftKey
      ? ciclo[(i - 1 + ciclo.length) % ciclo.length]
      : ciclo[(i + 1) % ciclo.length];
    e.preventDefault();
    siguiente.focus();
  }

  private enfocables(): HTMLElement[] {
    return Array.from(this.menu().nativeElement.querySelectorAll<HTMLElement>('a[href]'));
  }
}
