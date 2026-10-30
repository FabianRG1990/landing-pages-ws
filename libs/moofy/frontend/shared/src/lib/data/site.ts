/* ============================================================
   MOOFY — Contenido y datos del sitio
   Todo el copy y todos los datos de contacto viven aquí: cambiar
   un teléfono o una frase no obliga a tocar ninguna plantilla.
   ------------------------------------------------------------
   Datos tomados de las fuentes de Moofy:
   · moofycr.com — teléfono, planta en Grecia.
   · facebook.com/PanificadoraMoofyPanrico — WhatsApp Business,
     correo, San Roque de Grecia, «repostería fina empacada».
   · El catálogo oficial (oct. 2026) — los productos, su categoría,
     su descripción y sus fotos.
   Nada de toneladas ni certificaciones: no están publicados y no se
   inventan.
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
  { etiqueta: 'Catálogo', ancla: '#catalogo' },
  { etiqueta: 'Cobertura', ancla: '#cobertura' },
  { etiqueta: 'Fábrica', ancla: '#fabrica' },
  { etiqueta: 'Canales', ancla: '#canales' },
] as const;

export const HERO = {
  eyebrow: 'Fábrica de repostería · Costa Rica',
  titulo: [
    [{ t: 'Nuestro ' }, { t: 'catálogo', em: true }],
    [{ t: 'llega adonde ' }, { t: 'usted', em: true }, { t: ' esté.' }],
  ] as readonly Renglon[],
  entrada:
    'Seis líneas de repostería fina empacada, de nuestra planta en Grecia a cualquier punto del país.',
  ctaPrimario: 'Agendar reunión comercial',
  ctaSecundario: 'Ver catálogo',
  pegatina: ['Hecho en', 'Costa Rica'],
  // La leyenda que da la vuelta al sello; termina en separador porque
  // el final se une con el principio. «Desde 1997» lo publica la marca.
  selloVuelta: 'Desde 1997 · Planta propia · Grecia · ',
  // Las dos cifras del hero, que son los dos mensajes de la página: el
  // catálogo y la cobertura. Solo hechos publicados.
  cifras: [
    { valor: 6, texto: 'Líneas' },
    { valor: 7, texto: 'Provincias' },
  ],
} as const;

export const FABRICA = {
  num: '03',
  nombre: 'La fábrica',
  titulo: [[{ t: 'No revendemos. ' }, { t: 'Fabricamos.', em: true }]] as readonly Renglon[],
  entrada:
    'Cada pieza sale de nuestra planta en Grecia. La receta, el horno, el empaque y el camión que la lleva son nuestros.',
  // Foto real de la planta, recortada de una publicación de Moofy
  imagen: 'img/planta-manos.webp',
  alt: 'Manos dando forma, una por una, a los bizcochos de maíz sobre la mesa de la planta.',
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
} as const;

/* Capítulo 02. Solo hechos ya publicados: siete provincias, flota
   propia, entrega programada, la planta en San Roque de Grecia y el
   año en que empezó (1997, de las publicaciones de la marca). */
export const COBERTURA = {
  num: '02',
  nombre: 'Cobertura',
  titulo: [[{ t: 'De Grecia a ' }, { t: 'todo el país.', em: true }]] as readonly Renglon[],
  entrada: 'Despachamos con nuestros camiones a cualquier punto del país.',
  origen: 'Planta · Grecia',
  datos: [
    { valor: '7', titulo: 'Provincias', detalle: 'Despacho a todo el país' },
    { valor: '1', titulo: 'Planta propia', detalle: 'San Roque de Grecia, desde 1997' },
  ],
  notas: ['Flota propia', 'Entrega programada'],
} as const;

/** Las seis líneas de la portada. Los productos de cada una están en
 *  PRODUCTOS; aquí va su nombre corto, que es lo que cabe en la tarjeta. */
export const LINEAS = {
  num: '01',
  nombre: 'Catálogo',
  titulo: [[{ t: 'Seis líneas. ' }, { t: 'Un mismo estándar.', em: true }]] as readonly Renglon[],
  entrada: 'Veinte productos, todos de la misma planta. Pida muestras de la línea que encaja con su operación.',
  verTodo: 'Catálogo completo',
  items: [
    {
      id: 'hojaldre',
      nombre: 'Hojaldre',
      /** El nombre en los cuadros pequeños del hero, en un renglón. */
      corto: 'Hojaldre',
      productos: ['Palmeritas', 'Costilla con guayaba', 'Empanadas'],
      ideal: 'Cafeterías · Hoteles',
      imagen: 'img/productos/palmeritas.webp',
      alt: 'Palmerita azucarada de hojaldre, delante de su bolsa Moofy.',
    },
    {
      id: 'gatos',
      nombre: 'Gatos rellenos',
      corto: 'Gatos',
      productos: ['Choco gatos', 'Gatos de piña', 'Gatos de guayaba'],
      ideal: 'Supermercados · Conveniencia',
      imagen: 'img/productos/choco-gatos.webp',
      alt: 'Choco gato relleno de dulce de leche, delante de su bolsa Moofy.',
    },
    {
      id: 'pasteleria',
      nombre: 'Pastelería',
      corto: 'Pastelería',
      productos: ['Arrollado', 'Torta chilena', 'Quequito'],
      ideal: 'Cafeterías · Catering',
      imagen: 'img/productos/torta-chilena.webp',
      alt: 'Porción de torta chilena con dulce de leche, delante de su empaque Moofy.',
    },
    {
      id: 'panaderia-dulce',
      nombre: 'Panadería dulce',
      corto: 'Panadería',
      productos: ['Rollitos de canela', 'Media luna'],
      ideal: 'Hoteles · Cafeterías',
      imagen: 'img/productos/rollitos-canela.webp',
      alt: 'Rollito de canela glaseado, delante de su caja Moofy.',
    },
    {
      id: 'galleteria',
      nombre: 'Galletería',
      corto: 'Galletería',
      productos: ['Julietas', 'Choco chip y avena', 'Galletas Pan', 'Bizcotela'],
      ideal: 'Supermercados · Vending',
      imagen: 'img/productos/julietas.webp',
      alt: 'Galleta dulce tipo Julieta con su punto de guayaba, delante de su bolsa Moofy.',
    },
    {
      id: 'salados',
      nombre: 'Salados y tradicionales',
      corto: 'Salados',
      productos: ['Palitos de queso', 'Rosquillas', 'Grissines', 'Bizcochos de maíz', 'Bizcochos de guayaba'],
      ideal: 'Conveniencia · Vending',
      imagen: 'img/productos/palitos-queso.webp',
      alt: 'Palito casero con queso, delante de su bolsa Moofy.',
    },
  ],
} as const;

/** El id de una línea, para agrupar los productos. */
export type LineaId = (typeof LINEAS.items)[number]['id'];

export interface Producto {
  readonly id: string;
  readonly nombre: string;
  readonly categoria: string;
  readonly linea: LineaId;
  /** Resumen de la ficha del catálogo; null si la del catálogo no sirve. */
  readonly descripcion: string | null;
  readonly atributos: readonly string[];
  /** La pieza delante de su empaque, sin fondo; null si el catálogo no trae foto. */
  readonly imagen: string | null;
  /** El empaque, en miniatura, para reconocerlo en la góndola; null si
   *  no hay foto de él o si la foto principal ya es el empaque. */
  readonly empaque: string | null;
  readonly alt: string;
}

/* Los veinte productos del catálogo oficial, con la categoría y los
   atributos tal como los publica Moofy. Las descripciones son la idea
   principal de cada ficha, recortada para una tarjeta. El quequito va
   sin descripción: en el catálogo trae, por error, la de la torta
   chilena. Siete productos aún no tienen foto. */
export const PRODUCTOS: readonly Producto[] = [
  {
    id: 'palmeritas',
    nombre: 'Palmeritas azucaradas',
    categoria: 'Repostería hojaldrada',
    linea: 'hojaldre',
    descripcion: 'Crujientes y doraditas, de capas hojaldradas ligeras con el toque dulce justo.',
    atributos: ['Crujiente y ligera', 'Capas hojaldradas'],
    imagen: 'img/productos/palmeritas.webp',
    empaque: 'img/productos/palmeritas-empaque.webp',
    alt: 'Palmerita azucarada, delante de su bolsa Moofy.',
  },
  {
    id: 'costilla-guayaba',
    nombre: 'Costilla con guayaba',
    categoria: 'Hojaldre relleno',
    linea: 'hojaldre',
    descripcion: 'Dorada y crujiente, con un toque de azúcar y un relleno generoso de guayaba.',
    atributos: ['Crocante', 'Centro suave'],
    imagen: 'img/productos/costilla-guayaba.webp',
    empaque: 'img/productos/costilla-guayaba-empaque.webp',
    alt: 'Costilla de hojaldre rellena de guayaba, delante de su bolsa Moofy.',
  },
  {
    id: 'empanadas',
    nombre: 'Empanadas de piña y de guayaba',
    categoria: 'Repostería rellena horneada',
    linea: 'hojaldre',
    descripcion: 'Doraditas y crujientes por fuera, suaves por dentro y con un relleno generoso.',
    atributos: ['Crujiente', 'Relleno dulce'],
    imagen: null,
    empaque: null,
    alt: '',
  },
  {
    id: 'choco-gatos',
    nombre: 'Choco gatos con dulce de leche',
    categoria: 'Pan dulce relleno',
    linea: 'gatos',
    descripcion: 'Suaves, con aroma a chocolate y un relleno de dulce de leche.',
    atributos: ['Suave y esponjoso', 'Relleno cremoso'],
    imagen: 'img/productos/choco-gatos.webp',
    empaque: 'img/productos/choco-gatos-empaque.webp',
    alt: 'Choco gato relleno de dulce de leche, delante de su bolsa Moofy.',
  },
  {
    id: 'gatos-pina',
    nombre: 'Gatos con piña',
    categoria: 'Pan dulce relleno',
    linea: 'gatos',
    descripcion: 'Suaves y esponjosos, con un relleno de piña de sabor fresco.',
    atributos: ['Suave y esponjoso', 'Relleno frutal'],
    imagen: 'img/productos/gatos-pina.webp',
    empaque: 'img/productos/gatos-pina-empaque.webp',
    alt: 'Gato relleno de piña, delante de su bolsa Moofy.',
  },
  {
    id: 'gatos-guayaba',
    nombre: 'Gatos con guayaba',
    categoria: 'Pan dulce relleno',
    linea: 'gatos',
    descripcion: 'Tiernos y suaves, con un relleno de guayaba de sabor intenso.',
    atributos: ['Suave y ligero', 'Sabor tropical'],
    imagen: 'img/productos/gatos-guayaba.webp',
    empaque: 'img/productos/gatos-guayaba-empaque.webp',
    alt: 'Gato relleno de guayaba, delante de su bolsa Moofy.',
  },
  {
    id: 'arrollado',
    nombre: 'Arrollado con dulce de leche',
    categoria: 'Pastelería enrollada',
    linea: 'pasteleria',
    descripcion: 'Esponjoso y ligero, con una generosa capa de dulce de leche.',
    atributos: ['Ligero y esponjoso', 'Relleno dulce'],
    imagen: 'img/productos/arrollado.webp',
    empaque: 'img/productos/arrollado-empaque.webp',
    alt: 'Rodaja de arrollado con dulce de leche, delante de su bolsa Moofy.',
  },
  {
    id: 'torta-chilena',
    nombre: 'Torta chilena',
    categoria: 'Pastelería de capas',
    linea: 'pasteleria',
    descripcion: 'Capas finas con un relleno generoso de dulce de leche.',
    atributos: ['Capas finas', 'Relleno abundante'],
    imagen: 'img/productos/torta-chilena.webp',
    empaque: 'img/productos/torta-chilena-empaque.webp',
    alt: 'Porción de torta chilena, delante de su empaque Moofy.',
  },
  {
    id: 'quequito',
    nombre: 'Quequito de vainilla',
    categoria: 'Repostería',
    linea: 'pasteleria',
    descripcion: null,
    atributos: ['Esponjoso', 'Dulce'],
    imagen: 'img/productos/quequito.webp',
    empaque: 'img/productos/quequito-empaque.webp',
    alt: 'Quequito de vainilla, delante de su bolsa Moofy.',
  },
  {
    id: 'rollitos-canela',
    nombre: 'Rollitos de canela',
    categoria: 'Panadería dulce especiada',
    linea: 'panaderia-dulce',
    descripcion: 'Doraditos y suaves, con ese aroma a canela que despierta el antojo.',
    atributos: ['Suave', 'Dulce'],
    imagen: 'img/productos/rollitos-canela.webp',
    empaque: 'img/productos/rollitos-canela-empaque.webp',
    alt: 'Rollito de canela glaseado, delante de su caja Moofy.',
  },
  {
    id: 'media-luna',
    nombre: 'Media luna',
    categoria: 'Panadería dulce',
    linea: 'panaderia-dulce',
    descripcion: 'Doradita, suave y ligera, de sabor delicado para acompañar un café.',
    atributos: ['Suave', 'Ligero'],
    imagen: null,
    empaque: null,
    alt: '',
  },
  {
    id: 'julietas',
    nombre: 'Galletas dulces tipo Julieta',
    categoria: 'Galleta rellena tradicional',
    linea: 'galleteria',
    descripcion: 'Crujientes por fuera, se deshacen en la boca y llevan un punto de guayaba.',
    atributos: ['Dulzor suave', 'Toque frutal'],
    imagen: 'img/productos/julietas.webp',
    empaque: 'img/productos/julietas-empaque.webp',
    alt: 'Galleta tipo Julieta, delante de su bolsa Moofy.',
  },
  {
    id: 'choco-chip-avena',
    nombre: 'Galletas choco chip y de avena',
    categoria: 'Galletería artesanal',
    linea: 'galleteria',
    descripcion: 'Doraditas y crujientes, con sabor casero y un toque de avena.',
    atributos: ['Crujiente', 'Sabor casero'],
    imagen: null,
    empaque: null,
    alt: '',
  },
  {
    id: 'galletas-pan',
    nombre: 'Galletas Pan',
    categoria: 'Galletería artesanal',
    linea: 'galleteria',
    descripcion: 'Crujientes y doraditas, de textura ligera y dulzor suave.',
    atributos: ['Crujiente', 'Ligero'],
    imagen: null,
    empaque: null,
    alt: '',
  },
  {
    id: 'bizcotela',
    nombre: 'Bizcotela azucarada',
    categoria: 'Repostería azucarada',
    linea: 'galleteria',
    descripcion: 'Delgada y doradita, ligera y crocante, con un toque de azúcar.',
    atributos: ['Ligera', 'Toque dulce'],
    imagen: null,
    empaque: null,
    alt: '',
  },
  {
    id: 'palitos-queso',
    nombre: 'Palitos caseros con queso',
    categoria: 'Panadería salada',
    linea: 'salados',
    descripcion: 'Crujientes y ligeros, con el sabor del queso en cada mordida.',
    atributos: ['Crocante', 'Ligero'],
    imagen: 'img/productos/palitos-queso.webp',
    empaque: 'img/productos/palitos-queso-empaque.webp',
    alt: 'Palito casero con queso, delante de su bolsa Moofy.',
  },
  {
    id: 'rosquillas',
    nombre: 'Rosquillas tostadas con queso',
    categoria: 'Panadería tostada',
    linea: 'salados',
    descripcion: 'Doraditas y bien tostadas, con queso por encima.',
    atributos: ['Crocante', 'Toque salado'],
    imagen: null,
    empaque: null,
    alt: '',
  },
  {
    id: 'grissines',
    nombre: 'Grissines',
    categoria: 'Panadería italiana',
    linea: 'salados',
    descripcion: 'Crujientes y de textura firme, para picar o acompañar.',
    atributos: ['Crocante', 'Firme'],
    imagen: null,
    empaque: null,
    alt: '',
  },
  {
    id: 'bizcochos-maiz',
    nombre: 'Bizcochos de maíz',
    categoria: 'Repostería tradicional',
    linea: 'salados',
    descripcion: 'Firmes y doraditos, con el toque de maíz de siempre.',
    atributos: ['Tradicional', 'Sabor casero'],
    imagen: 'img/productos/bizcochos-maiz.webp',
    empaque: null,
    alt: 'Bolsa Moofy de bizcochos de maíz.',
  },
  {
    id: 'bizcochos-guayaba',
    nombre: 'Bizcochos de guayaba',
    categoria: 'Bizcocho relleno',
    linea: 'salados',
    descripcion: 'Suaves y dulces, con un relleno de guayaba.',
    atributos: ['Suave', 'Relleno dulce'],
    imagen: 'img/productos/bizcochos-guayaba.webp',
    empaque: 'img/productos/bizcochos-guayaba-empaque.webp',
    alt: 'Bizcocho relleno de guayaba, delante de su caja Moofy.',
  },
];

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
  num: '04',
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
        { k: 'Líneas', v: 'Hojaldre · Pastelería · Panadería dulce' },
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
        { k: 'Líneas', v: 'Hojaldre · Pastelería · Galletería' },
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
        { k: 'Líneas', v: 'Galletería · Gatos rellenos · Salados' },
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
        { k: 'Líneas', v: 'Gatos rellenos · Salados · Galletería' },
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
        { k: 'Líneas', v: 'Pastelería · Hojaldre · Salados' },
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
        { k: 'Líneas', v: 'Gatos rellenos · Panadería dulce · Pastelería' },
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
        { k: 'Líneas', v: 'Galletería · Salados' },
        { k: 'Entrega', v: 'Programada con flota propia' },
      ],
    },
  ] as readonly Canal[],
} as const;

export const PROCESO = {
  num: '05',
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
  num: '06',
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

/* La página del catálogo completo (/catalogo): los veinte productos
   agrupados por línea, cada uno con su botón para pedir muestras. */
export const CATALOGO = {
  descripcionPagina:
    'Los veinte productos de Moofy en seis líneas: hojaldre, gatos rellenos, pastelería, panadería dulce, galletería y salados. Repostería fina empacada, fabricada en Grecia, Costa Rica.',
  insignia: 'Catálogo completo',
  titulo: [[{ t: 'Todo lo que ' }, { t: 'horneamos.', em: true }]] as readonly Renglon[],
  entrada:
    'Veinte productos en seis líneas, todos de nuestra planta en Grecia. Pida muestras de los que encajan con su operación.',
  volver: 'Volver al inicio',
  indice: 'Líneas del catálogo',
  muestras: 'Pedir muestras',
  sinFoto: 'Foto en preparación',
  empaque: 'Así llega',
  cierre: {
    titulo: [[{ t: '¿Armamos su ' }, { t: 'surtido?', em: true }]] as readonly Renglon[],
    texto: 'Le ayudamos a elegir los productos y las cantidades que encajan con su canal.',
    cta: 'Agendar reunión comercial',
  },
} as const;

/** El mensaje de WhatsApp para pedir muestras de un producto. */
export function mensajeProducto(producto: string): string {
  return `Hola, Moofy. Me interesa recibir muestras de «${producto}» para mi empresa.`;
}

/** El mensaje de WhatsApp para pedir muestras de una línea. */
export function mensajeMuestras(linea: string): string {
  return `Hola, Moofy. Me interesa recibir muestras de la línea «${linea}» para mi empresa.`;
}
