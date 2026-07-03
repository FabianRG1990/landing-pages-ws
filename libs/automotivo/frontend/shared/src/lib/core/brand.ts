import { Injectable, signal } from '@angular/core';

/**
 * Datos de contacto REALES del taller. No inventar.
 * Fuente: fichas de Google / redes de Automotivo.
 */
export const BRAND = {
  name: 'Automotivo',
  slogan: 'Nuestro motivo sos vos.',
  eyebrow: 'Especialistas en tu vehículo · Heredia',
  phone: '4419-5703',
  phoneRaw: '44195703',
  whatsapp: '8455-9609',
  whatsappRaw: '50684559609',
  email: 'servicioautomotivo@gmail.com',
  facebook: 'https://www.facebook.com/automotivocr/?locale=es_LA',
  instagram: 'https://www.instagram.com/automotivocr/',
  address: 'Santo Domingo · San Miguel, Heredia, Costa Rica',
  geo: { lat: 9.979225, lng: -84.053139 },
  hours: 'Lun–Vie · 8:00 a. m. – 6:00 p. m.',
} as const;

export const WHATSAPP_LINK = `https://wa.me/${BRAND.whatsappRaw}?text=${encodeURIComponent(
  'Hola Automotivo, quisiera agendar una cita para mi vehículo.',
)}`;
export const MAPS_DIR_LINK = `https://www.google.com/maps/dir/?api=1&destination=${BRAND.geo.lat},${BRAND.geo.lng}`;
export const MAPS_EMBED_SRC = `https://maps.google.com/maps?q=${BRAND.geo.lat},${BRAND.geo.lng}&z=16&output=embed`;
export const MAIL_LINK = `mailto:${BRAND.email}`;

@Injectable({ providedIn: 'root' })
export class BrandService {
  readonly brand = signal(BRAND);
  readonly waLink = WHATSAPP_LINK;
  readonly mapsDir = MAPS_DIR_LINK;
  readonly mapsEmbed = MAPS_EMBED_SRC;
  readonly mailLink = MAIL_LINK;
  readonly year = new Date().getFullYear();

  /** ¿abierto ahora? Lun–Vie 8–18, hora de Costa Rica (UTC-6). */
  isOpenNow(now = new Date()): boolean {
    // Aproximación por UTC-6 sin depender de la zona del navegador.
    const cr = new Date(now.getTime() + (now.getTimezoneOffset() - 360) * 60000);
    const day = cr.getDay(); // 0 dom … 6 sáb
    const h = cr.getHours();
    return day >= 1 && day <= 5 && h >= 8 && h < 18;
  }
}
