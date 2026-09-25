import { MenuCategory } from '../core/models';

// Transcripción fiel de las categorías y precios (en colones) del artefacto original.
// El 3er elemento opcional de cada tupla son los sabores del producto — solo lo
// llevan los productos donde el nombre lista alternativas reales (separadas con
// "o"), no ingredientes de una misma receta (separados con "y").
//
// Masa Madre va primero: es el producto principal de la casa y el más caro del
// catálogo, y la carta se lee en este orden.
const RAW_CATS: { key: string; label: string; tag: string; items: [string, number, string[]?][] }[] = [
  {
    key: 'masa-madre',
    label: 'Masa Madre',
    tag: '#A5761C',
    items: [
      ['Masa madre ajo parmesano y perejil', 3500],
      ['Masa madre tomate y aceitunas', 3500],
      ['Masa madre tomate y albahaca', 3500],
      ['Masa madre queso amarillo y jalapeño', 3500],
      ['Masa madre con chispas de chocolate', 3500],
      ['Masa madre con arándanos', 3500],
      ['Masa madre sencillo', 3500],
      ['Multigrano (1kg)', 5000],
      ['Multigrano integral', 5000],
      ['Multigrano integral con miel y manzana verde', 5000],
    ],
  },
  {
    key: 'pan-dulce',
    label: 'Pan Dulce',
    tag: '#C8912A',
    items: [
      ['NY cookies', 1500],
      [
        'Croissant de crema pastelera, dulce de leche o nutella',
        2500,
        ['Crema pastelera', 'Dulce de leche', 'Nutella'],
      ],
      ['Croissant de dulce de pistacho', 2800],
      ['Bollas dulces', 2000],
      ['Pan casero de naranja', 1500],
      ['Budín ron, pasas y maracuyá', 1200],
      ['Rollos de canela', 1500],
      ['Empanadita de chiverre o piña', 500, ['Chiverre', 'Piña']],
      ['Pan de yuca', 1500],
      ['Crocante alemán', 2000],
      ['Pan de elote', 1500],
    ],
  },
  {
    key: 'pan-salado',
    label: 'Pan Salado',
    tag: '#5E6A34',
    items: [
      ['Croissant mantequilla', 1500],
      ['Burrito de carne, frijoles y jalapeño', 1500],
      ['Pancito de especies con crema jalapeño', 800],
      ['Nuditos de ajo y perejil', 800],
      ['Palitos de queso y especies', 500],
      ['Pizzitas', 1500],
      ['Enchiladas de papa, pollo o carne', 1200, ['Papa', 'Pollo', 'Carne']],
      ['Bolla natillera', 2000],
      ['Rollos de cebolla, jamón y queso', 1500],
      ['Baguette', 700],
    ],
  },
  {
    key: 'saltenas',
    label: 'Salteñas',
    tag: '#7a5c2e',
    items: [
      ['Salteña clásica de carne', 2500],
      ['Salteña clásica de pollo', 2500],
      ['Salteña de cinco quesos', 2500],
      ['Salteña de cebolla caramelizada y quesos', 2500],
      ['Salteña Argentina capresse', 2500],
      ['Salteña Argentina de jamón y dos quesos', 2500],
    ],
  },
];

export const MENU_CATEGORIES: MenuCategory[] = RAW_CATS.map((c) => ({
  key: c.key,
  label: c.label,
  tag: c.tag,
  items: c.items.map(([name, price, options], i) => ({
    id: `${c.key}-${i}`,
    name,
    price,
    cat: c.label,
    tag: c.tag,
    ...(options ? { options } : {}),
  })),
}));

export function formatColones(n: number): string {
  return '₡' + n.toLocaleString('de-DE');
}
