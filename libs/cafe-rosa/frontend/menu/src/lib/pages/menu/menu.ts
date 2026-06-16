import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '@cafe-rosa-ui-shared';

interface MenuItem {
  readonly name: string;
  readonly desc: string;
  readonly price: string;
  readonly tag: string;
}

interface MenuCategory {
  readonly category: string;
  /** Path del SVG inline que identifica la categoría (sin lucide). */
  readonly iconPath: string;
  readonly items: readonly MenuItem[];
}

/**
 * Menú — carta de la casa con tabs por categoría (cafés, pastelería, brunch) y
 * grid de platos. Equivale a `<MenuHighlight/>` del original React; las
 * transiciones de framer-motion se sustituyen por CSS (clase activa + appReveal).
 */
@Component({
  selector: 'app-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective],
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
})
export class MenuPage {
  protected readonly activeCategory = signal(0);

  protected readonly categories: readonly MenuCategory[] = [
    {
      category: 'Cafés Especiales',
      // Taza de café.
      iconPath:
        'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3',
      items: [
        {
          name: 'Rosa Latte',
          desc: 'Espresso doble, leche de avena, sirope de pétalos de rosa y espuma rosada',
          price: '€6.50',
          tag: '⭐ Bestseller',
        },
        {
          name: 'Etiopía Natural',
          desc: 'Single origin tostado claro, notas de fresa, jazmín y bergamota',
          price: '€5.50',
          tag: '🌍 Origen',
        },
        {
          name: 'Cold Brew Rosado',
          desc: 'Infusión 18h en frío, hibisco, limón y miel de flores',
          price: '€7.00',
          tag: '❄️ Frío',
        },
      ],
    },
    {
      category: 'Pastelería Rosa',
      // Hoja / pétalo.
      iconPath:
        'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10zM2 21c0-3 1.85-5.36 5.08-6',
      items: [
        {
          name: 'Croissant de Frambuesa',
          desc: 'Masa hojaldrada artesanal, crema de frambuesa, glaseado de rosas',
          price: '€4.80',
          tag: '🥐 Horneado hoy',
        },
        {
          name: 'Tarta Rosa',
          desc: 'Bizcocho de vainilla, mousse de fresas, decoración de flores comestibles',
          price: '€6.50',
          tag: '🌸 Especial',
        },
        {
          name: 'Macaron Rojo y Rosa',
          desc: 'Ganache de chocolate ruby, pétalos de rosa liofilizados',
          price: '€3.50',
          tag: '✨ Signature',
        },
      ],
    },
    {
      category: 'Menú Brunch',
      // Destellos / sparkles.
      iconPath:
        'M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17l-1.9-5.1L4.5 10l5.6-1.4L12 3zM19 3v4M21 5h-4M5 17v3M6.5 18.5h-3',
      items: [
        {
          name: 'Toast Avocado Rosa',
          desc: 'Pan de masa madre, aguacate, rábanos, microgreens, vinagreta de hibisco',
          price: '€12.00',
          tag: '🥑 Vegano',
        },
        {
          name: 'Eggs Benedict Rosado',
          desc: 'Huevos poché, jamón ibérico, salsa holandesa de trufa y pimentón rosa',
          price: '€15.50',
          tag: '👑 Premium',
        },
        {
          name: 'Açaí Bowl',
          desc: 'Açaí orgánico, granola artesanal, frutos del bosque, miel de romero',
          price: '€10.50',
          tag: '💜 Healthy',
        },
      ],
    },
  ];

  /**
   * Items de la categoría activa. Computed tipado (no index-signature) que
   * recae en la primera categoría si el índice quedara fuera de rango.
   */
  protected readonly activeItems = computed<readonly MenuItem[]>(() => {
    const cat = this.categories[this.activeCategory()] ?? this.categories[0];
    return cat.items;
  });

  protected setCategory(i: number): void {
    this.activeCategory.set(i);
  }
}
