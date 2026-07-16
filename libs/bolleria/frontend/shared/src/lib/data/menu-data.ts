import { MenuCategory, MenuItem } from '../core/models';

// Transcripción fiel de las categorías y precios (en colones) del artefacto original.
const RAW_CATS: { key: string; label: string; tag: string; items: [string, number][] }[] = [
  {
    key: 'pan-dulce',
    label: 'Pan Dulce',
    tag: '#C8912A',
    items: [
      ['NY cookies', 1500],
      ['Croissant de crema pastelera, dulce de leche o nutella', 2500],
      ['Croissant de dulce de pistacho', 2800],
      ['Bollas dulces', 2000],
      ['Pan casero de naranja', 1500],
      ['Budín ron, pasas y maracuyá', 1200],
      ['Rollos de canela', 1500],
      ['Empanadita de chiverre o piña', 500],
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
      ['Enchiladas de papa, pollo o carne', 1200],
      ['Bolla natillera', 2000],
      ['Rollos de cebolla, jamón y queso', 1500],
      ['Baguette', 700],
    ],
  },
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
    key: 'saltenas',
    label: 'Salteñas',
    tag: '#7a5c2e',
    items: [
      ['Clásica de carne', 2500],
      ['Clásica de pollo', 2500],
      ['Cinco quesos', 2500],
      ['Cebolla caramelizada y quesos', 2500],
      ['Argentina capresse', 2500],
      ['Argentina de jamón y dos quesos', 2500],
    ],
  },
];

export const MENU_BY_ID: Record<string, MenuItem> = {};

export const MENU_CATEGORIES: MenuCategory[] = RAW_CATS.map((c) => ({
  key: c.key,
  label: c.label,
  tag: c.tag,
  items: c.items.map(([name, price], i) => {
    const item: MenuItem = { id: `${c.key}-${i}`, name, price, cat: c.label, tag: c.tag };
    MENU_BY_ID[item.id] = item;
    return item;
  }),
}));

// Favoritos de la casa mostrados en "inicio" — mismos 3 ids que el original.
export const FAVORITE_IDS = ['pan-dulce-2', 'pan-dulce-6', 'saltenas-2'];

export function formatColones(n: number): string {
  return '₡' + n.toLocaleString('de-DE');
}
