/* ============================================================
   MOOFY — Contenido y datos del sitio
   Todo el copy y todos los datos de contacto viven aquí: cambiar
   un teléfono o una frase no obliga a tocar ninguna plantilla.
   ------------------------------------------------------------
   Datos tomados de las fuentes públicas de Moofy (sept. 2026):
   · moofycr.com — teléfono, planta en Grecia, líneas de producto.
   · facebook.com/PanificadoraMoofyPanrico — WhatsApp Business,
     correo, San Roque de Grecia, «repostería fina empacada».
   Nada de años, toneladas ni certificaciones: no están publicados
   y no se inventan.
   ============================================================ */

/** Un tramo de titular. `em` lo pinta en cursiva dorada. */
export interface Tramo {
  readonly t: string;
  readonly em?: boolean;
}

/** Un renglón de titular, partido en tramos. */
export type Renglon = readonly Tramo[];

const WA_NUMERO = '50688780709';

/**
 * La variante de 800 px de una foto (misma ruta con «-800»). El móvil la
 * recibe siempre, con <picture>: con un srcset normal un teléfono 3x pedía
 * la de 1536 y no ahorraba nada. En escritorio decide el srcset.
 */
export function foto800(src: string): string {
  return src.replace(/\.webp$/, '-800.webp');
}

/** Enlace de WhatsApp con el mensaje ya redactado. */
export function enlaceWhatsapp(mensaje: string): string {
  return `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}

export const SITE = {
  marca: 'Moofy',
  razonSocial: 'Moofy Internacional S.A.',
  telefono: '(506) 2494-1100',
  telefonoHref: 'tel:+50624941100',
  whatsappVisible: '8878-0709',
  // El correo publicado es de una persona; si prefieren un buzón
  // genérico (ventas@), se cambia solo aquí.
  correo: 'kbolanos@moofycr.com',
  planta: 'San Roque, Grecia, Alajuela',
  facebook: 'https://www.facebook.com/PanificadoraMoofyPanrico/',
  instagram: 'https://www.instagram.com/moofycr/',
  mensajeReunion: 'Hola, Moofy. Quiero agendar una reunión comercial.',
  mensajeVisita: 'Hola, Moofy. Me gustaría coordinar una visita a la planta en Grecia.',
} as const;

export const NAV = [
  { etiqueta: 'Fábrica', ancla: '#fabrica' },
  { etiqueta: 'Líneas', ancla: '#lineas' },
  { etiqueta: 'Canales', ancla: '#canales' },
  { etiqueta: 'Proceso', ancla: '#proceso' },
] as const;

export const HERO = {
  eyebrow: 'Fábrica de repostería · Costa Rica',
  titulo: [
    [{ t: 'Hecho en ' }, { t: 'nuestra', em: true }, { t: ' planta.' }],
    [{ t: 'Servido en ' }, { t: 'su', em: true }, { t: ' mesa.' }],
  ] as readonly Renglon[],
  entrada:
    'Repostería fina empacada, producida en planta propia para empresas que no negocian la calidad.',
  ctaPrimario: 'Agendar reunión comercial',
  ctaSecundario: 'Ver líneas',
  imagen: 'img/hero-hojaldre.webp',
  alt: 'Hojaldres dorados recién horneados sobre la bandeja de una línea de producción.',
  pegatina: ['Hecho en', 'Costa Rica'],
  // La leyenda que da la vuelta al sello; termina en separador porque
  // el final se une con el principio.
  selloVuelta: 'Planta propia · Grecia · Alajuela · ',
  // La tarjeta de datos del hero: solo hechos publicados.
  tarjeta: {
    etiqueta: 'Planta propia · Grecia',
    cifra: '06',
    cifraTexto: 'Líneas en producción',
    datos: [
      { k: 'Canales', v: '9' },
      { k: 'Provincias', v: '7' },
      { k: 'Flota', v: 'Propia' },
    ],
  },
} as const;

export const FABRICA = {
  num: '01',
  nombre: 'La fábrica',
  titulo: [[{ t: 'No revendemos. ' }, { t: 'Fabricamos.', em: true }]] as readonly Renglon[],
  entrada:
    'Cada pieza sale de nuestra planta en Grecia. La receta, el horno, el empaque y el camión que la lleva son nuestros.',
  imagen: 'img/planta-linea.webp',
  alt: 'Operarios con bata y redecilla revisan una línea de horneado en la planta.',
  pilares: [
    {
      icono: 'espiga',
      titulo: 'Formulación propia',
      texto: 'Nuestras recetas y nuestro estándar, sin intermediarios.',
    },
    {
      icono: 'gorro',
      titulo: 'Producción controlada',
      texto: 'De la masa al empaque sellado, bajo el mismo techo.',
    },
    {
      icono: 'camion',
      titulo: 'Flota propia',
      texto: 'Despachamos con nuestros camiones a cualquier punto del país.',
    },
  ],
  cifras: [
    { valor: 1, titulo: 'Planta propia', detalle: 'San Roque de Grecia' },
    { valor: 7, titulo: 'Provincias', detalle: 'Despacho a todo el país' },
  ],
} as const;

export const LINEAS = {
  num: '02',
  nombre: 'Líneas',
  titulo: [[{ t: 'Seis líneas. ' }, { t: 'Un mismo estándar.', em: true }]] as readonly Renglon[],
  entrada: 'Todo sale de la misma planta. Pida muestras de la línea que encaja con su operación.',
  items: [
    {
      id: 'hojaldre',
      nombre: 'Hojaldre',
      productos: ['Pañuelos de hojaldre'],
      ideal: 'Hoteles · Cafeterías',
      imagen: 'img/lineas/hojaldre.webp',
      alt: 'Pañuelos de hojaldre dorados con capas visibles.',
    },
    {
      id: 'queques',
      nombre: 'Queques',
      productos: ['Queques', 'Bizcochos'],
      ideal: 'Cafeterías · Catering',
      imagen: 'img/lineas/queques.webp',
      alt: 'Queque en rebanadas sobre tabla de madera oscura.',
    },
    {
      id: 'empanadas',
      nombre: 'Empanadas',
      productos: ['Empanadas', 'Empanaditas'],
      ideal: 'Conveniencia · Instituciones',
      imagen: 'img/lineas/empanadas.webp',
      alt: 'Empanadas horneadas con el repulgue dorado.',
    },
    {
      id: 'galletas',
      nombre: 'Galletas y alfajores',
      productos: ['Galletas', 'Alfajores'],
      ideal: 'Supermercados · Vending',
      imagen: 'img/lineas/galletas.webp',
      alt: 'Alfajores y galletas apilados con luz lateral cálida.',
    },
    {
      id: 'salados',
      nombre: 'Salados',
      productos: ['Palitos de queso', 'Grisines'],
      ideal: 'Conveniencia · Vending',
      imagen: 'img/lineas/salados.webp',
      alt: 'Palitos de queso y grisines horneados en un haz.',
    },
    {
      id: 'pan-dulce',
      nombre: 'Pan dulce',
      productos: ['Trenzas', 'Roscas'],
      ideal: 'Supermercados · Hoteles',
      imagen: 'img/lineas/pan-dulce.webp',
      alt: 'Trenza y rosca de pan dulce con brillo de horneado.',
    },
  ],
} as const;

export interface Canal {
  readonly id: string;
  readonly nombre: string;
  readonly frase: string;
  readonly imagen: string;
  readonly alt: string;
  readonly datos: readonly { readonly k: string; readonly v: string }[];
}

/* Los datos de cada canal describen la NECESIDAD del cliente y qué
   líneas encajan; no prometen formatos ni plazos que Moofy no ha
   publicado. La entrega se acuerda en la reunión. */
export const CANALES = {
  num: '03',
  nombre: 'Canales',
  titulo: [[{ t: 'Producimos para ' }, { t: 'su', em: true }, { t: ' operación.' }]] as readonly Renglon[],
  entrada: 'Elija su canal y vea qué resolvemos.',
  items: [
    {
      id: 'hoteles',
      nombre: 'Hoteles y resorts',
      frase: 'El desayuno es la primera impresión del día.',
      imagen: 'img/canales/hotel.webp',
      alt: 'Buffet de desayuno de hotel con repostería dorada.',
      datos: [
        { k: 'Su necesidad', v: 'Buffet, room service y coffee breaks' },
        { k: 'Líneas', v: 'Hojaldre · Queques · Pan dulce' },
        { k: 'Entrega', v: 'Programada con flota propia' },
      ],
    },
    {
      id: 'cafeterias',
      nombre: 'Cafeterías de especialidad',
      frase: 'Un acompañante a la altura del café.',
      imagen: 'img/canales/cafeteria.webp',
      alt: 'Barra de cafetería con repostería junto a una taza de café.',
      datos: [
        { k: 'Su necesidad', v: 'Vitrina constante, pieza a pieza' },
        { k: 'Líneas', v: 'Hojaldre · Queques · Galletas' },
        { k: 'Entrega', v: 'Programada con flota propia' },
      ],
    },
    {
      id: 'supermercados',
      nombre: 'Supermercados',
      frase: 'Producto empacado listo para góndola.',
      imagen: 'img/canales/supermercado.webp',
      alt: 'Góndola ordenada con repostería empacada.',
      datos: [
        { k: 'Su necesidad', v: 'Rotación y presentación en anaquel' },
        { k: 'Líneas', v: 'Galletas · Pan dulce · Queques' },
        { k: 'Entrega', v: 'Programada con flota propia' },
      ],
    },
    {
      id: 'conveniencia',
      nombre: 'Conveniencia y estaciones',
      frase: 'Lo que se lleva en la mano, siempre disponible.',
      imagen: 'img/canales/conveniencia.webp',
      alt: 'Exhibidor de tienda de conveniencia con snacks horneados.',
      datos: [
        { k: 'Su necesidad', v: 'Snack individual de compra rápida' },
        { k: 'Líneas', v: 'Empanadas · Salados · Galletas' },
        { k: 'Entrega', v: 'Programada con flota propia' },
      ],
    },
    {
      id: 'catering',
      nombre: 'Catering corporativo',
      frase: 'Eventos sin improvisar el servicio.',
      imagen: 'img/canales/catering.webp',
      alt: 'Mesa de catering corporativo con bandejas de repostería.',
      datos: [
        { k: 'Su necesidad', v: 'Volumen puntual con calidad constante' },
        { k: 'Líneas', v: 'Queques · Hojaldre · Salados' },
        { k: 'Entrega', v: 'Coordinada por evento' },
      ],
    },
    {
      id: 'instituciones',
      nombre: 'Instituciones',
      frase: 'Volumen diario con el mismo estándar.',
      imagen: 'img/canales/catering.webp',
      alt: 'Bandejas de repostería listas para servicio institucional.',
      datos: [
        { k: 'Su necesidad', v: 'Abastecimiento diario y previsible' },
        { k: 'Líneas', v: 'Empanadas · Pan dulce · Queques' },
        { k: 'Entrega', v: 'Programada con flota propia' },
      ],
    },
    {
      id: 'distribuidores',
      nombre: 'Distribuidores',
      frase: 'Un fabricante detrás de su catálogo.',
      imagen: 'img/planta-flota.webp',
      alt: 'Camiones de reparto blancos frente a la planta al amanecer.',
      datos: [
        { k: 'Su necesidad', v: 'Surtido amplio de un solo proveedor' },
        { k: 'Líneas', v: 'Las seis líneas' },
        { k: 'Entrega', v: 'Según su ruta y volumen' },
      ],
    },
    {
      id: 'marca-privada',
      nombre: 'Marca privada',
      frase: 'Su producto, hecho en nuestra planta.',
      imagen: 'img/canales/empaque.webp',
      alt: 'Empaques lisos sin impresión alineados al final de la línea.',
      datos: [
        { k: 'Su necesidad', v: 'Producto propio sin montar una fábrica' },
        { k: 'Líneas', v: 'A definir con su equipo' },
        { k: 'Entrega', v: 'Se acuerda en la reunión' },
      ],
    },
    {
      id: 'vending',
      nombre: 'Vending',
      frase: 'Porciones que resisten la máquina.',
      imagen: 'img/canales/conveniencia.webp',
      alt: 'Snacks horneados en empaque individual.',
      datos: [
        { k: 'Su necesidad', v: 'Empaque individual y vida útil' },
        { k: 'Líneas', v: 'Galletas · Salados' },
        { k: 'Entrega', v: 'Programada con flota propia' },
      ],
    },
  ] as readonly Canal[],
} as const;

export const PROCESO = {
  num: '04',
  nombre: 'Proceso',
  titulo: [[{ t: 'De la reunión a la ' }, { t: 'entrega recurrente.', em: true }]] as readonly Renglon[],
  pasos: [
    { n: '01', titulo: 'Reunión', texto: 'Entendemos su operación, su canal y su volumen.' },
    { n: '02', titulo: 'Muestras', texto: 'Degustación de las líneas que encajan con su oferta.' },
    { n: '03', titulo: 'Plan de abastecimiento', texto: 'Surtido, cantidades y calendario, por escrito.' },
    { n: '04', titulo: 'Entrega programada', texto: 'Nuestra flota despacha según lo acordado.' },
  ],
} as const;

export const CONTACTO = {
  num: '05',
  nombre: 'Hablemos',
  titulo: [[{ t: 'Hablemos de su ' }, { t: 'operación.', em: true }]] as readonly Renglon[],
  entrada: 'Elija su canal y abra la conversación directamente con el equipo comercial.',
  /* En móvil no hay chips de canal: no puede pedir que se elija uno */
  entradaMovil: 'Abra la conversación directamente con el equipo comercial.',
  pregunta: '¿Desde qué canal nos escribe?',
  cta: 'Escribir por WhatsApp',
  visita: 'Solicitar visita a planta',
} as const;

/** El mensaje de WhatsApp para un canal; sin canal, el genérico. */
export function mensajeCanal(canal: string | null): string {
  if (!canal) return SITE.mensajeReunion;
  return `Hola, Moofy. Escribo desde una empresa del canal «${canal}» y quiero agendar una reunión comercial.`;
}

export const PIE = {
  legal: `© 2026 ${SITE.razonSocial}`,
  nota: 'Fotografías ilustrativas.',
} as const;

/** El mensaje de WhatsApp para pedir muestras de una línea. */
export function mensajeMuestras(linea: string): string {
  return `Hola, Moofy. Me interesa recibir muestras de la línea «${linea}» para mi empresa.`;
}
