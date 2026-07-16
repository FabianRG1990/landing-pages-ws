export type ScreenId = 'inicio' | 'menu' | 'contacto';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  cat: string;
  tag: string;
}

export interface MenuCategory {
  key: string;
  label: string;
  tag: string;
  items: MenuItem[];
}
