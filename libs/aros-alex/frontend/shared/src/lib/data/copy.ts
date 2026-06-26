import { Bilingual } from '../i18n/types';

const M = (es: string, en: string): Bilingual => ({ es, en });

/* ============================================================
   AROS ALEX — Copy de secciones (títulos, leads, labels).
   El contenido en colecciones (aros, servicios, galería…) vive
   en `content.ts`; acá están los textos sueltos por sección.
   ============================================================ */
export const COPY = {
  ctaLabel: M('Cotizar', 'Get a quote'),
  brandTagline: 'Luxury Rims',

  hero: {
    eyebrow: M(
      'Atelier de aros · San José, Costa Rica',
      'Wheel atelier · San José, Costa Rica',
    ),
    title: M(
      'El arte de devolverle la vida a cada aro.',
      'The art of bringing every wheel back to life.',
    ),
    lead: M(
      'Reparación, enderezado, pintura y fabricación con estándar de competición. Tomamos el aro reventado, torcido o despintado y lo devolvemos como nuevo — impecable, al milímetro.',
      'Repair, straightening, refinishing and fabrication to race standard. We take the cracked, bent or faded wheel and return it like new — flawless, to the millimetre.',
    ),
    ctaWhatsapp: M('Cotizar por WhatsApp', 'Quote via WhatsApp'),
    ctaServices: M('Ver servicios', 'View services'),
    scroll: M('Scroll', 'Scroll'),
  },

  promesa: {
    eyebrow: M('La promesa', 'The promise'),
    title: M(
      'No reparamos aros. Restauramos la confianza de manejar sobre ellos.',
      "We don't just repair wheels. We restore the confidence of driving on them.",
    ),
  },

  resenas: {
    eyebrow: M('Lo que dicen los clientes', 'What clients say'),
    title: M('Reseñas verificadas', 'Verified reviews'),
    rating: '5.0',
    ratingLabel: M('Reseñas de Google', 'Google reviews'),
    verifiedClient: M('Cliente verificado', 'Verified client'),
  },

  servicios: {
    eyebrow: M('Servicios', 'Services'),
    title: M('Cuatro disciplinas, un solo estándar.', 'Four disciplines, a single standard.'),
    lead: M(
      'Cada aro pasa por el proceso completo: diagnóstico, corrección estructural, acabado y control final. Sin atajos.',
      'Every wheel goes through the full process: diagnosis, structural correction, finishing and a final check. No shortcuts.',
    ),
  },

  ventas: {
    eyebrow: M('Tienda · Catálogo Orbital', 'Store · Orbital catalogue'),
    title: M('Aros y llantas a la venta', 'Wheels & tires for sale'),
    lead: M(
      'Selección de aros Orbital nuevos en distintas medidas y acabados. Tocá el botón de WhatsApp de cada modelo para consultar disponibilidad y precio.',
      'A selection of new Orbital wheels in various sizes and finishes. Tap the WhatsApp button on any model to ask for availability and price.',
    ),
    cta: M('Consultar disponibilidad', 'Check availability'),
  },

  galeria: {
    eyebrow: M('Galería · Antes / Después', 'Gallery · Before / After'),
    title: M('El trabajo habla por sí solo.', 'The work speaks for itself.'),
    lead: M(
      'Una selección de aros que llegaron dañados y salieron como nuevos. Arrastrá el control de cada imagen para ver el antes y el después.',
      'A selection of wheels that arrived damaged and left like new. Drag the handle on each image to compare before and after.',
    ),
    before: M('Antes', 'Before'),
    after: M('Después', 'After'),
    jobLabel: M('Trabajo', 'Job'),
  },

  consultenos: {
    title: M(
      '¿Tenés un aro que parece imposible? Consultanos.',
      'Got a wheel that looks impossible? Ask us.',
    ),
    lead: M(
      'Mandanos una foto del daño por WhatsApp y te decimos si tiene solución y cuánto cuesta.',
      "Send us a photo of the damage on WhatsApp and we'll tell you if it can be fixed and what it costs.",
    ),
    cta: M('Enviar foto por WhatsApp', 'Send photo on WhatsApp'),
  },

  nosotros: {
    eyebrow: M('Nosotros · Trayectoria', 'About · Story'),
    title: M('Los pioneros en reparación de aros.', 'The pioneers in wheel repair.'),
    para1: M(
      'Aros Alex nació de un oficio: entender el metal y devolverle su forma. Desde San José, hicimos de la reparación de aros una disciplina precisa, cuando casi nadie la hacía bien.',
      'Aros Alex was born of a craft: understanding metal and giving it back its shape. From San José, we turned wheel repair into a precise discipline — when almost no one did it well.',
    ),
    para2: M(
      'Hoy atendemos cada aro, del carro de calle al deportivo, con el mismo principio: que salga del taller mejor de lo que entró.',
      'Today we treat every wheel, from the street car to the sports car, with the same principle: it leaves the shop better than it came in.',
    ),
    workshopImg: 'assets/aros-alex/taller-fachada.png',
    workshopLabel: M('Nuestro taller', 'Our workshop'),
    workshopLocation: M('San Fco. de Dos Ríos · San José', 'San Fco. de Dos Ríos · San José'),
    workshopVisit: M('Visitanos', 'Visit us'),
    principlesEyebrow: M('Principios', 'Principles'),
    principles: [
      {
        title: M('Precisión', 'Precision'),
        body: M(
          'Si vibra, no está listo. Cada aro se verifica antes de entregarse.',
          "If it vibrates, it isn't ready. Every wheel is verified before delivery.",
        ),
      },
      {
        title: M('Honestidad', 'Honesty'),
        body: M(
          'Si un aro no tiene reparación segura, te lo decimos. La seguridad va primero.',
          "If a wheel can't be safely repaired, we tell you. Safety comes first.",
        ),
      },
      {
        title: M('Acabado', 'Finish'),
        body: M(
          'El detalle es la diferencia. Buscamos que no se note la mano — solo el resultado.',
          'The detail is the difference. We aim for invisible work — only the result shows.',
        ),
      },
    ],
  },

  contacto: {
    eyebrow: M('Contáctenos', 'Contact us'),
    title: M('Hablemos de tu aro.', "Let's talk about your wheel."),
    lead: M(
      'Escribinos por WhatsApp, llamanos o mandanos el formulario. Te respondemos rápido y, si podés, una foto del daño nos ayuda a cotizar mejor.',
      'Message us on WhatsApp, call us or send the form. We reply fast, and a photo of the damage helps us quote better.',
    ),
    form: {
      eyebrow: M('Solicitud de cotización', 'Quote request'),
      title: M('Contanos qué necesitás', 'Tell us what you need'),
      fields: [
        {
          id: 'f-name',
          label: M('Nombre', 'Name'),
          placeholder: M('Tu nombre', 'Your name'),
          textarea: false,
        },
        {
          id: 'f-contact',
          label: M('Teléfono o email', 'Phone or email'),
          placeholder: M('Cómo te contactamos', 'How we reach you'),
          textarea: false,
        },
        {
          id: 'f-veh',
          label: M('Vehículo / tipo de aro', 'Vehicle / wheel type'),
          placeholder: M('Ej. Hilux aro 17 aleación', 'e.g. Hilux 17in alloy'),
          textarea: false,
        },
        {
          id: 'f-msg',
          label: M('Mensaje', 'Message'),
          placeholder: M('Describí el daño o lo que necesitás', 'Describe the damage or what you need'),
          textarea: true,
        },
      ],
      submit: M('Enviar solicitud', 'Send request'),
      note: M(
        'Se abrirá tu correo con el mensaje listo para enviar.',
        'Your email app will open with the message ready to send.',
      ),
    },
    whatsappLabel: M('Escribinos por WhatsApp', 'Message us on WhatsApp'),
    phoneLabel: M('Teléfono', 'Phone'),
    phoneAction: M('Llamar →', 'Call →'),
    emailLabel: M('Correo', 'Email'),
    emailAction: M('Escribir →', 'Write →'),
    locationLabel: M('Ubicación', 'Location'),
    addressLines: ['200 O y 25 N de la Bomba Delta,', 'San Francisco de Dos Ríos, San José'],
    mapAction: M('Abrir mapa →', 'Open map →'),
    hoursLabel: M('Horario', 'Hours'),
  },

  footer: {
    description: M(
      'Reparación, enderezado, pintura y fabricación de aros con estándar de competición. San José, Costa Rica.',
      'Wheel repair, straightening, paint and fabrication to race standard. San José, Costa Rica.',
    ),
    navHeading: M('Navegación', 'Navigation'),
    contactHeading: M('Contáctenos', 'Contact us'),
    hoursHeading: M('Horario', 'Hours'),
    hoursWeekday: M('Lun – Vie · 7:30–17:00', 'Mon – Fri · 7:30–17:00'),
    hoursSaturday: M('Sábado · 8:00–13:00', 'Saturday · 8:00–13:00'),
    hoursSunday: M('Domingo · Cerrado', 'Sunday · Closed'),
    copyright: '© 2026 Aros Alex S.A. · San José, Costa Rica',
    madeWith: M('Hecho con precisión.', 'Made with precision.'),
  },

  hours: {
    openNow: M('Abierto ahora', 'Open now'),
    closedNow: M('Cerrado ahora', 'Closed now'),
  },
} as const;
