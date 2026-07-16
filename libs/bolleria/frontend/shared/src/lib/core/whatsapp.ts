import { MENU_BY_ID, formatColones } from '../data/menu-data';
import { CONTACT } from '../data/contact-data';

/** Transcripción fiel de `buildOrderText` — %0A literal (no `encodeURIComponent`), igual que el original. */
export function buildOrderText(cart: Record<string, number>): string {
  const lines = Object.entries(cart).map(([id, q]) => {
    const it = MENU_BY_ID[id];
    return `• ${q}× ${it.name} — ${formatColones(it.price * q)}`;
  });
  const total = Object.entries(cart).reduce((s, [id, q]) => s + MENU_BY_ID[id].price * q, 0);
  return `Hola Bollería, quiero hacer un pedido:%0A${lines.join('%0A')}%0A%0ATotal: ${formatColones(total)}`;
}

export function waCheckoutLink(cart: Record<string, number>, cartCount: number): string {
  return cartCount > 0
    ? `https://wa.me/${CONTACT.whatsapp}?text=${buildOrderText(cart)}`
    : `https://wa.me/${CONTACT.whatsapp}`;
}

export function waDirectLink(): string {
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent('Hola Bollería, quiero hacer una consulta.')}`;
}

/** Transcripción fiel de `sendWa` del formulario de contacto. */
export function waContactLink(nombre: string, tel: string, msg: string): string {
  const text = `Hola Bollería, soy ${nombre} (${tel}).%0A${msg}`;
  return `https://wa.me/${CONTACT.whatsapp}?text=${text}`;
}

/** Transcripción fiel de `sendMail` del formulario de contacto. */
export function mailContactLink(nombre: string, tel: string, msg: string): string {
  const body = `Nombre: ${nombre}%0ATeléfono: ${tel}%0A%0A${msg}`;
  return `mailto:${CONTACT.correo}?subject=${encodeURIComponent('Consulta desde la web')}&body=${body}`;
}
