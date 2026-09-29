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
  viewChildren,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CANALES, enlaceWhatsapp, mensajeCanal } from '@moofy-ui-shared/data/site';
import { IconoComponent } from '@moofy-ui-shared/marca/icono';
import { CapituloComponent } from '@moofy-ui-shared/tipografia/capitulo';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';

/**
 * Capítulo 03: el comprador elige su canal y ve qué le resolvemos.
 *
 * Patrón de pestañas de WAI-ARIA con activación automática: el panel es
 * instantáneo, así que mover el foco con las flechas ya muestra el canal.
 * Tabindex itinerante (solo la pestaña activa entra en el orden de Tab),
 * flechas en los dos ejes porque la lista es vertical en escritorio y
 * horizontal en móvil, e Inicio/Fin para los extremos.
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
  protected readonly indice = signal(0);
  protected readonly activo = computed(() => this.c.items[this.indice()]);
  protected readonly whatsapp = computed(() => enlaceWhatsapp(mensajeCanal(this.activo().nombre)));

  /** Varias pestañas comparten foto: se pinta cada archivo una sola vez. */
  protected readonly imagenes = [...new Set(this.c.items.map((i) => i.imagen))].map((src) => ({ src }));

  /** La foto que se ve. Va detrás de `indice`: cambia cuando está lista. */
  protected readonly foto = signal<string>(this.c.items[0].imagen);

  private readonly pestanas = viewChildren<ElementRef<HTMLButtonElement>>('pestana');
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
      destroyRef.onDestroy(() => io.disconnect());
    });
  }

  protected elegir(i: number): void {
    this.indice.set(i);
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
    const boton = this.pestanas()[destino]?.nativeElement;
    boton?.focus();
    // En móvil la fila de chips se desplaza para que el elegido se vea.
    boton?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}
