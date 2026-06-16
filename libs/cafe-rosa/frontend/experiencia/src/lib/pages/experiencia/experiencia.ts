import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '@cafe-rosa-ui-shared';

interface MenuTier {
  readonly name: string;
  readonly subtitle: string;
  readonly price: string;
  readonly period: string;
  readonly emoji: string;
  readonly items: readonly string[];
  readonly highlight: boolean;
}

interface Testimonial {
  readonly name: string;
  readonly role: string;
  readonly content: string;
  readonly rating: number;
  readonly initials: string;
}

/**
 * Experiencia — pricing de experiencias (tres tiers, uno destacado) seguido de
 * un carrusel de reseñas arrastrable con punteros. Equivale a `<Pricing/>` +
 * `<Testimonials/>` del original React (sin framer-motion: drag manual fuera de
 * la zona de Angular, con clamp y honra de prefers-reduced-motion).
 */
@Component({
  selector: 'app-experiencia-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective],
  templateUrl: './experiencia.html',
  styleUrl: './experiencia.scss',
})
export class ExperienciaPage {
  protected readonly menuTiers: readonly MenuTier[] = [
    {
      name: 'Morning',
      subtitle: 'La magia del amanecer',
      price: '18',
      period: '/persona',
      emoji: '☕',
      items: [
        'Café de especialidad (origen único)',
        'Croissant artesanal recién horneado',
        'Zumo de naranja natural',
        'Fruta de temporada',
      ],
      highlight: false,
    },
    {
      name: 'Brunch Rosa',
      subtitle: 'La experiencia completa',
      price: '38',
      period: '/persona',
      emoji: '🌸',
      items: [
        'Todo del menú Morning',
        'Plato principal a elegir (3 opciones)',
        'Postre de la casa',
        'Bebida caliente ilimitada',
        'Detalle de bienvenida',
      ],
      highlight: true,
    },
    {
      name: 'Privado',
      subtitle: 'Eventos y celebraciones',
      price: '120+',
      period: '/grupo',
      emoji: '✨',
      items: [
        'Reserva de sala privada',
        'Menú personalizado',
        'Maridaje de cafés premium',
        'Decoración temática rosa',
        'Servicio exclusivo dedicado',
      ],
      highlight: false,
    },
  ];

  protected readonly testimonials: readonly Testimonial[] = [
    {
      name: 'Sofía Martínez',
      role: 'Fotógrafa & Creadora de Contenido',
      content:
        'Rosa Café es literalmente el lugar más bonito de la ciudad. Cada rincón es una foto, cada taza es un poema. Mi lugar favorito para trabajar y soñar.',
      rating: 5,
      initials: 'SM',
    },
    {
      name: 'Lucía Fernández',
      role: 'Diseñadora de moda',
      content:
        'El capuchino de rosas es una obra de arte. La estética rosa me tiene completamente enamorada. Vengo todos los sábados sin excepción.',
      rating: 5,
      initials: 'LF',
    },
    {
      name: 'Valentina Cruz',
      role: 'Escritora & Bloguer',
      content:
        'Encontré mi inspiración aquí. El ambiente, los aromas, el café... Todo conspira para hacerte sentir en el lugar más mágico del mundo.',
      rating: 5,
      initials: 'VC',
    },
    {
      name: 'Isabella Romero',
      role: 'Arquitecta',
      content:
        'El diseño del local es extraordinario. Pero lo que más me sorprende es la calidad del café de origen etíope. Una experiencia multisensorial única.',
      rating: 5,
      initials: 'IR',
    },
    {
      name: 'María José Álvarez',
      role: 'Estilista',
      content:
        'Mis clientes siempre me preguntan dónde quedo con mis amigas. La respuesta siempre es la misma: Rosa Café. Un lugar de diez.',
      rating: 5,
      initials: 'MJ',
    },
  ];

  /** Testimonios duplicados para sensación de continuidad al arrastrar. */
  protected readonly carouselItems: readonly Testimonial[] = [
    ...this.testimonials,
    ...this.testimonials,
  ];

  private readonly viewport =
    viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** Número de estrellas a renderizar para un rating dado (strictTemplates). */
  protected stars(rating: number): readonly number[] {
    return Array.from({ length: rating }, (_, i) => i);
  }

  constructor() {
    afterNextRender(() => {
      if (!this.isBrowser) return;

      const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      // Con movimiento reducido se deja el scroll horizontal nativo (CSS); no
      // se enganchan punteros para evitar drag forzado.
      if (reduce) return;

      const viewport = this.viewport().nativeElement;
      const track = this.track().nativeElement;

      this.zone.runOutsideAngular(() => {
        let offset = 0;
        let startX = 0;
        let startOffset = 0;
        let dragging = false;
        let pointerId: number | null = null;

        const maxScroll = () =>
          Math.max(0, track.scrollWidth - viewport.clientWidth);

        const clamp = (v: number): number => {
          const min = -maxScroll();
          if (v > 0) return 0;
          if (v < min) return min;
          return v;
        };

        const apply = () => {
          track.style.transform = `translate3d(${offset}px, 0, 0)`;
        };

        const onDown = (e: PointerEvent) => {
          dragging = true;
          pointerId = e.pointerId;
          startX = e.clientX;
          startOffset = offset;
          viewport.classList.add('is-dragging');
          viewport.setPointerCapture(e.pointerId);
        };

        const onMove = (e: PointerEvent) => {
          if (!dragging) return;
          offset = clamp(startOffset + (e.clientX - startX));
          apply();
        };

        const onUp = () => {
          if (!dragging) return;
          dragging = false;
          viewport.classList.remove('is-dragging');
          if (pointerId !== null && viewport.hasPointerCapture(pointerId)) {
            viewport.releasePointerCapture(pointerId);
          }
          pointerId = null;
        };

        // Reclamp ante cambios de tamaño (no salir de límites al estrechar).
        const onResize = () => {
          offset = clamp(offset);
          apply();
        };

        viewport.addEventListener('pointerdown', onDown);
        viewport.addEventListener('pointermove', onMove);
        viewport.addEventListener('pointerup', onUp);
        viewport.addEventListener('pointercancel', onUp);
        window.addEventListener('resize', onResize, { passive: true });

        this.destroyRef.onDestroy(() => {
          viewport.removeEventListener('pointerdown', onDown);
          viewport.removeEventListener('pointermove', onMove);
          viewport.removeEventListener('pointerup', onUp);
          viewport.removeEventListener('pointercancel', onUp);
          window.removeEventListener('resize', onResize);
        });
      });
    });
  }
}
