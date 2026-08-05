import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface CaptionLine {
  align: 'left' | 'center' | 'right';
  text: string;
  // 'lg' = frase corta/poética, tipografía grande dramática (default).
  // 'sm' = oración explicativa larga, mismo estilo pero contenida para que
  // no se desborde sobre el sujeto de la foto.
  size?: 'lg' | 'sm';
}

interface AboutSlide {
  src: string;
  alt: string;
  top: CaptionLine[];
  bottom: CaptionLine[];
}

interface TextSeg {
  t: string;
  b: boolean;
}

// Orden narrativo confirmado a mano por el cliente, imagen por imagen (no es
// el orden en que llegaron los archivos): empleada -> babka -> mostrador ->
// croissants -> masa madre -> rollo de dulce de leche. El texto de cada
// caption es verbatim de las capturas originales de Instagram.
const SLIDES: AboutSlide[] = [
  {
    src: 'assets/about-1.webp',
    alt: 'Encargada de La Bollería recibiendo a los clientes junto al mostrador',
    top: [{ align: 'left', text: 'hola, pasa!' }],
    bottom: [{ align: 'right', text: 'vamos a contarte un poco de nosotros' }],
  },
  {
    src: 'assets/about-2.webp',
    alt: 'Rebanada de babka de chocolate recién horneada',
    top: [
      {
        align: 'right',
        text: 'somos una **panadería artesanal** y estamos ubicados en **Grecia**',
        size: 'sm',
      },
    ],
    bottom: [],
  },
  {
    src: 'assets/about-3.webp',
    alt: 'Mostrador de La Bollería con lámparas de mimbre y vitrina de pan',
    top: [{ align: 'right', text: 'nuestro espacio es el resultado de dos historias que se encontraron:', size: 'lg' }],
    // Sobre los tablones de madera del mostrador (zona vacía, sin producto),
    // en vez de compartir arriba con la primera frase — así cada una respira
    // y puede leerse a un tamaño cómodo.
    bottom: [{ align: 'center', text: 'la disciplina del deporte y la tradición de una familia panadera', size: 'sm' }],
  },
  {
    src: 'assets/about-4.webp',
    alt: 'Croissants artesanales sobre fondo naranja',
    top: [
      {
        align: 'left',
        text: 'Desde el inicio quisimos hacer algo diferente: apostar por productos artesanales y saludables, como el pan de masa madre',
        size: 'sm',
      },
      {
        align: 'center',
        text: 'y ofrecer también esos pequeños gusticos que tanto nos gustan, como los croissants y la repostería',
        size: 'sm',
      },
    ],
    bottom: [],
  },
  {
    src: 'assets/about-5.webp',
    alt: 'Pan de masa madre recién horneado, partido a la mitad',
    top: [
      {
        align: 'center',
        text: 'trabajamos todos los días por hornear mejor, crear mejor contenido y atenderles cada vez más bonito',
        size: 'sm',
      },
    ],
    bottom: [],
  },
  {
    src: 'assets/about-6.webp',
    alt: 'Rollo relleno de dulce de leche espolvoreado con azúcar',
    top: [
      { align: 'right', text: 'te esperamos de lunes a domingo' },
      { align: 'left', text: 'con pan recién horneado y un cafécito caliente.' },
    ],
    bottom: [],
  },
];

/**
 * Secuencia cinematográfica "Acerca de nosotros": la misma familia de
 * técnica que ya usa `HeroScrollComponent` (columna fija con `position:
 * sticky` mientras el scroll avanza), pero resuelta con el patrón estándar
 * de "scrollytelling por pasos" (el mismo truco que usa la librería
 * scrollama) en vez del scrubbing continuo del hero: una franja de 1px al
 * centro del viewport (`rootMargin: -50% 0px -50% 0px`) como único punto de
 * disparo — el paso que la cruza queda activo. Mucho más liviano que el
 * canvas del hero porque acá solo hay 6 fotos reales, no 233 cuadros.
 */
@Component({
  selector: 'bol-about-scroll',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about-scroll.component.html',
  styleUrl: './about-scroll.component.scss',
})
export class AboutScrollComponent implements AfterViewInit, OnDestroy {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly stepRefs = viewChildren<ElementRef<HTMLElement>>('stepEl');

  readonly slides = SLIDES;
  readonly active = signal(0);

  private observer: IntersectionObserver | null = null;

  splitBold(text: string): TextSeg[] {
    return text.split('**').map((t, i) => ({ t, b: i % 2 === 1 }));
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number((entry.target as HTMLElement).dataset['stepIndex']);
          if (!Number.isNaN(idx)) this.active.set(idx);
        }
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 },
    );
    for (const ref of this.stepRefs()) this.observer.observe(ref.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
