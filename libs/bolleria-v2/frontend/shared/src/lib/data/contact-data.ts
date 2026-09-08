// Datos de contacto REALES del negocio, confirmados por el dueño el 2026-08-30.
// Antes de esa fecha eran marcadores de posición, y el sitio lo advertía en el
// pie de página.
//
// Esta constante es la ÚNICA fuente: de aquí salen la página de Contacto, el pie
// de página, el enlace por el que llegan los PEDIDOS del carrito y el PDF del
// pedido. Cambiar `whatsapp` cambia a qué teléfono llegan los pedidos, así que
// no se toca sin confirmarlo con el negocio.
export const CONTACT = {
  whatsapp: '50660409549',
  waDisplay: '+506 6040 9549',
  // El mismo número que el WhatsApp: el negocio tiene una sola línea. Se
  // conservan los dos campos porque la página los rotula por separado y podrían
  // volver a separarse.
  telDisplay: '+506 6040 9549',
  correo: 'labolleria.crb@gmail.com',
  /** Una sola línea, para donde no cabe más: pie de página y pie del PDF. */
  horario: 'Lun – Sáb 7:00 a.m. – 7:00 p.m. · Dom hasta 6:00 p.m.',
  /** El horario como lo anuncia el negocio, para la página de Contacto. */
  horarioDetalle: [
    { dias: 'Lunes a sábado', horas: '7:00 a.m. – 7:00 p.m.' },
    { dias: 'Domingo', horas: '7:00 a.m. – 6:00 p.m.' },
  ],
  // PENDIENTE: falta el texto de la dirección (provincia, cantón, distrito y
  // señas). Va vacía a propósito y la página no la pinta mientras lo esté: el
  // valor anterior decía "San José, Costa Rica" y las coordenadas de abajo caen
  // en Alajuela, así que era un dato falso. Antes falta que sobre mal.
  direccion: '',
  /** Coordenadas del local, tomadas del mapa que comparte el negocio. */
  lat: 10.07171237179534,
  lon: -84.31399347430197,
  // Ficha del negocio en Google Maps por su CID, no una búsqueda por nombre ni
  // unas coordenadas sueltas: así se abre el sitio real -con su nombre, sus
  // fotos y sus reseñas- y no un alfiler en mitad del mapa.
  mapsUrl: 'https://www.google.com/maps?cid=2146718029304571150',
  instagram: 'https://www.instagram.com/labolleriacr/',
  facebook: 'https://www.facebook.com/p/La-Boller%C3%ADa-100090992470804/',
} as const;
