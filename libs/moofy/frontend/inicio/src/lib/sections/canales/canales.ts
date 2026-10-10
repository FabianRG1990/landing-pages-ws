import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CANALES, enlaceWhatsapp, foto800, mensajeCanal } from '@moofy-ui-shared/data/site';
import { IconoComponent } from '@moofy-ui-shared/marca/icono';
import { CapituloComponent } from '@moofy-ui-shared/tipografia/capitulo';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';

/** Píxeles de recorrido en los que el aviso de «hay más» llega a verse entero. */
const RAMPA = 24;

/**
 * Capítulo 03: el comprador elige su canal y ve qué le resolvemos.
 *
 * Patrón de pestañas de WAI-ARIA con activación automática: el panel es
 * instantáneo, así que mover el foco con las flechas ya muestra el canal.
 * Tabindex itinerante (solo la pestaña activa entra en el orden de Tab),
 * flechas en los dos ejes porque la lista es vertical en escritorio y
 * horizontal en móvil, e Inicio/Fin para los extremos.
 *
 * En móvil la fila de chips se desplaza de lado y no cabe entera: el
 * borde por el que queda contenido se desvanece y lleva una flecha, y
 * el chip elegido se centra para que siempre asome el siguiente.
 *
 * Las fotos: las ocultas tienen el recorte cerrado y el navegador las
 * da por invisibles, así que con `loading="lazy"` no se pedían hasta el
 * clic y la cortina corría sobre una foto que aún no había llegado. Se
 * precargan y decodifican cuando la sección está a una pantalla, y la
 * cortina de cada cambio espera a que la foto nueva esté decodificada.
 */
@Component({
  selector: 'app-canales',
  imports: [CapituloComponent, RenglonesComponent, RevelarDirective, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './canales.html',
  styleUrl: './canales.scss',
})
export class CanalesComponent {
  protected readonly c = CANALES;
  protected readonly foto800 = foto800;
  protected readonly indice = signal(0);
  protected readonly activo = computed(() => this.c.items[this.indice()]);
  /** Un enlace por canal: cada tarjeta lleva el suyo. */
  protected readonly enlaces = this.c.items.map((i) => enlaceWhatsapp(mensajeCanal(i.nombre)));

  /** Varias pestañas comparten foto: se pinta cada archivo una sola vez. */
  protected readonly imagenes = [...new Set(this.c.items.map((i) => i.imagen))].map((src) => ({ src }));

  /** La foto que se ve. Va detrás de `indice`: cambia cuando está lista. */
  protected readonly foto = signal<string>(this.c.items[0].imagen);

  private readonly pestanas = viewChildren<ElementRef<HTMLButtonElement>>('pestana');
  private readonly carril = viewChild.required<ElementRef<HTMLElement>>('carril');
  private readonly pista = viewChild.required<ElementRef<HTMLElement>>('pista');
  private readonly fotos = viewChildren<ElementRef<HTMLImageElement>>('capa');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Una decodificación por archivo, compartida entre clics. */
  private readonly decodificadas = new Map<string, Promise<void>>();

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;
      // A una pantalla de distancia: con tiempo para bajar las fotos,
      // pero sin competir con el hero en la carga inicial.
      const io = new IntersectionObserver(
        (entradas) => {
          if (!entradas.some((e) => e.isIntersecting)) return;
          io.disconnect();
          for (const { src } of this.imagenes) void this.lista(src);
        },
        { rootMargin: '100% 0px' },
      );
      io.observe(this.host.nativeElement);

      const pista = this.pista().nativeElement;
      const ro = new ResizeObserver(() => this.asomar());
      ro.observe(pista);
      pista.addEventListener('scroll', this.asomar, { passive: true });
      destroyRef.onDestroy(() => {
        io.disconnect();
        ro.disconnect();
        pista.removeEventListener('scroll', this.asomar);
      });
    });
  }

  /**
   * Cuánto queda por ver a cada lado de la fila, de 0 a 1: crece con los
   * primeros píxeles de recorrido, así el desvanecido no aparece de golpe.
   */
  private readonly asomar = (): void => {
    const pista = this.pista().nativeElement;
    const resto = pista.scrollWidth - pista.clientWidth - pista.scrollLeft;
    const estilo = this.carril().nativeElement.style;
    estilo.setProperty('--antes', Math.min(1, Math.max(0, pista.scrollLeft / RAMPA)).toFixed(3));
    estilo.setProperty('--mas', Math.min(1, Math.max(0, resto / RAMPA)).toFixed(3));
  };

  /** Lleva el chip al centro de la fila, sin mover la página. */
  private centrar(i: number): void {
    const pista = this.pista().nativeElement;
    const chip = this.pestanas()[i]?.nativeElement;
    if (!chip || pista.scrollWidth <= pista.clientWidth) return;
    const c = chip.getBoundingClientRect();
    const left = pista.scrollLeft + c.left - pista.getBoundingClientRect().left - (pista.clientWidth - c.width) / 2;
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    pista.scrollTo({ left, behavior: quieto ? 'auto' : 'smooth' });
  }

  protected elegir(i: number): void {
    this.indice.set(i);
    this.centrar(i);
    const src = this.c.items[i].imagen;
    // La pestaña y la tarjeta cambian ya; la cortina, con la foto lista.
    // Si falla la carga se cambia igual: mejor el fondo que quedarse en
    // la foto de otro canal.
    void this.lista(src).finally(() => {
      if (this.activo().imagen === src) this.foto.set(src);
    });
  }

  /** Pide la foto (si seguía en espera) y la decodifica, una sola vez. */
  private lista(src: string): Promise<void> {
    let p = this.decodificadas.get(src);
    if (!p) {
      const img = this.fotos().find((f) => f.nativeElement.getAttribute('src') === src)?.nativeElement;
      if (!img) return Promise.resolve();
      img.loading = 'eager';
      p = img.decode().catch(() => undefined);
      this.decodificadas.set(src, p);
    }
    return p;
  }

  protected teclado(e: KeyboardEvent): void {
    const n = this.c.items.length;
    const actual = this.indice();
    let destino: number;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        destino = (actual + 1) % n;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        destino = (actual - 1 + n) % n;
        break;
      case 'Home':
        destino = 0;
        break;
      case 'End':
        destino = n - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    this.elegir(destino);
    this.pestanas()[destino]?.nativeElement.focus({ preventScroll: true });
  }
}
