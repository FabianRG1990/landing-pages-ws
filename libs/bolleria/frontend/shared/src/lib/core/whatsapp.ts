import { CONTACT } from '../data/contact-data';

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
