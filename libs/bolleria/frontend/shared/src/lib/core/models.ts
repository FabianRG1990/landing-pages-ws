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

export type DeliveryType = 'comer-aqui' | 'retirar' | 'envio-expres';

export const DELIVERY_LABELS: Record<DeliveryType, string> = {
  'comer-aqui': 'Comer aquí',
  retirar: 'Retirar en el local',
  'envio-expres': 'Envío exprés',
};

/** Una línea del pedido ya resuelta (item + sabor elegido, si aplica) — lo que consume el PDF y el mensaje de WhatsApp. */
export interface OrderLine {
  qty: number;
  item: MenuItem;
  option?: string;
}

export interface GeneratedOrder {
  orderNumber: string;
  /** Fecha del pedido en formato DD/MM/AAAA — se muestra aparte del número, nunca fusionada con él. */
  orderDate: string;
  filename: string;
  /** blob URL para previsualizar en un iframe */
  url: string;
  /** dispara la descarga del PDF ya generado */
  save: () => void;
}
