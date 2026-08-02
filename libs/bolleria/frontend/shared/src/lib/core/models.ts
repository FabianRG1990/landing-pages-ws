export type ScreenId = 'inicio' | 'menu' | 'contacto';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  cat: string;
  tag: string;
  /** Sabores/variantes a elegir antes de agregar al pedido (ej. Croissant: crema pastelera / dulce de leche / nutella). */
  options?: string[];
}

export interface MenuCategory {
  key: string;
  label: string;
  tag: string;
  items: MenuItem[];
}
