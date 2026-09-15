import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MENU_CATEGORIES, formatColones, waDirectLink } from '@bolleria-v2-ui-shared';

interface Foto {
  src: string;
  alt: string;
}

/**
 * Dos fotos por categoría: una para su tarjeta del índice (`cat-*`, reducida al
 * tamaño de tarjeta) y otra distinta para el costado de su sección (`carta-*`).
 */
const FOTOS: Record<string, { indice: Foto; seccion: Foto }> = {
  'masa-madre': {
    indice: { src: 'assets/cat-masa-madre.webp', alt: 'Hogaza de masa madre partida en rebanadas sobre una tabla de madera' },
    seccion: { src: 'assets/carta-masa-madre.webp', alt: 'Hogaza de masa madre enharinada con rebanadas sobre una tabla redonda' },
  },
  'pan-dulce': {
    indice: { src: 'assets/cat-pan-dulce.webp', alt: 'Rollo de canela con dulce de leche, rollo de arándanos y croissant de pistacho' },
    seccion: { src: 'assets/carta-pan-dulce.webp', alt: 'Rollo de canela partido con crema, chocolate y almendras, junto a otro con dulce de leche' },
  },
  'pan-salado': {
    indice: { src: 'assets/cat-pan-salado.webp', alt: 'Trenzas de queso, pizzeta de tomate y medialuna salada en un plato' },
    seccion: { src: 'assets/carta-pan-salado.webp', alt: 'Pizzetas de tomate, panes de queso y medialunas saladas sobre una tabla' },
  },
  saltenas: {
    indice: { src: 'assets/cat-saltenas.webp', alt: 'Salteñas horneadas sobre una tabla, una abierta con relleno de carne y papa' },
    seccion: { src: 'assets/carta-saltenas.webp', alt: 'Salteñas doradas en un plato, una abierta con relleno de carne y papa' },
  },
};

/** Glifo de WhatsApp, el mismo del resto del sitio; va dos veces en la carta. */
const WA_GLIFO =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';

@Component({
  selector: 'bol-menu-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-page.component.html',
  styleUrl: './menu-page.component.scss',
})
export class MenuPageComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly waDirect = waDirectLink();
  readonly waGlifo = WA_GLIFO;
  readonly fmt = formatColones;

  /**
   * El ancla lleva prefijo: `masa-madre` a secas es un id demasiado genérico
   * para una página que monta el nav, el pie y el resto de pantallas.
   */
  readonly categorias = MENU_CATEGORIES.map((c, i) => ({
    ...c,
    ancla: `carta-${c.key}`,
    numero: String(i + 1).padStart(2, '0'),
    foto: FOTOS[c.key],
  }));

  /**
   * Baja a la sección SIN escribir el `#` en la dirección: la navegación del
   * sitio vive en el store, no en la URL, y un hash suelto se quedaría puesto al
   * cambiar de pantalla.
   *
   * `instant` y no `auto` con «menos movimiento»: `html` lleva
   * `scroll-behavior: smooth`, y `auto` obedece a esa regla, así que también
   * deslizaría.
   */
  irA(ev: Event, ancla: string): void {
    ev.preventDefault();
    if (!this.isBrowser) return;
    const destino = document.getElementById(ancla);
    if (!destino) return;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    destino.scrollIntoView({ behavior: reducido ? 'instant' : 'smooth', block: 'start' });
    destino.focus({ preventScroll: true });
  }
}
