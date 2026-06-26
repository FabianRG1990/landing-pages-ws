import {
  Filter,
  GalleryItem,
  HoursRow,
  NavItem,
  PromiseCard,
  Review,
  ServiceCard,
  Wheel,
} from './types';

/* ============================================================
   AROS ALEX — Contenido del sitio (bilingüe ES/EN)
   Extraído verbatim del diseño aprobado. Todo el texto traducible
   vive acá como datos tipados; los templates lo renderizan con
   `@for` + `LanguageStore.t()`.
   ============================================================ */

/** Ítems de navegación (orden = navbar y menú móvil). */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'inicio', label: { es: 'Inicio', en: 'Home' }, num: '01' },
  { id: 'servicios', label: { es: 'Servicios', en: 'Services' }, num: '02' },
  { id: 'galeria', label: { es: 'Galería', en: 'Gallery' }, num: '03' },
  { id: 'nosotros', label: { es: 'Nosotros', en: 'About' }, num: '04' },
  { id: 'contacto', label: { es: 'Contáctenos', en: 'Contact us' }, num: '05' },
];

/** Datos de contacto reutilizables (navbar, footer, contacto). */
export const CONTACT = {
  whatsapp: { number: '8560-2560', href: 'https://wa.me/50685602560' },
  phone: { number: '2226-4453', href: 'tel:+50622264453' },
  email: { address: 'arosalexcr@gmail.com', href: 'mailto:arosalexcr@gmail.com' },
  instagram: { handle: '@arosalexcr', href: 'https://www.instagram.com/arosalexcr/' },
  facebook: { handle: 'arosalexcr', href: 'https://www.facebook.com/arosalexcr' },
  address: '200 O y 25 N de la Bomba Delta, San Francisco de Dos Ríos, San José',
  mapLink:
    'https://www.google.com/maps/search/?api=1&query=Aros+Alex+San+Francisco+de+Dos+Rios+San+Jose+Costa+Rica',
} as const;

/** Disciplinas mostradas en marquee del hero. */
export const HERO_MARQUEE: readonly string[] = [
  'Reparación',
  'Enderezado',
  'Pintura',
  'Fabricación',
  'Venta de aros y llantas',
];

/** Tarjetas de "La promesa" (Inicio · Acto 2). */
export const PROMISES: readonly PromiseCard[] = [
  {
    num: '01',
    icon: 'precision',
    title: { es: 'Precisión al milímetro', en: 'Millimetre precision' },
    body: {
      es: 'Balanceo y geometría verificados. El aro vuelve perfectamente concéntrico, sin vibración al manejar.',
      en: 'Balance and geometry verified. The wheel returns perfectly concentric, with no vibration when driving.',
    },
  },
  {
    num: '02',
    icon: 'finish',
    title: { es: 'Acabado de fábrica', en: 'Factory finish' },
    body: {
      es: 'Pintura y restauración que no se distingue del original. Color, brillo y textura idénticos.',
      en: 'Paint and restoration indistinguishable from the original. Identical colour, gloss and texture.',
    },
  },
  {
    num: '03',
    icon: 'craft',
    title: { es: 'Oficio pionero', en: 'Pioneering craft' },
    body: {
      es: 'Los pioneros en reparación de aros del país, con el mismo estándar de excelencia en cada pieza.',
      en: "The country's pioneers in wheel repair, with the same standard of excellence on every piece.",
    },
  },
];

/** Las cuatro disciplinas (Servicios). */
export const SERVICES: readonly ServiceCard[] = [
  {
    num: '01',
    icon: 'repair',
    title: { es: 'Reparación', en: 'Repair' },
    body: {
      es: 'Aros reventados, quebrados o agrietados. Recuperamos la integridad estructural con soldadura especializada y verificación de fuga.',
      en: 'Cracked, broken or split wheels. We recover structural integrity with specialised welding and leak verification.',
    },
  },
  {
    num: '02',
    icon: 'straighten',
    title: { es: 'Enderezado', en: 'Straightening' },
    body: {
      es: 'Aros torcidos por huecos o golpes. Corrección térmica y mecánica hasta devolver el balanceo perfecto, sin vibración al manejar.',
      en: 'Wheels bent by potholes or impacts. Thermal and mechanical correction until perfect balance returns, with no driving vibration.',
    },
  },
  {
    num: '03',
    icon: 'paint',
    title: { es: 'Pintura y restauración', en: 'Paint & restoration' },
    body: {
      es: 'Despintado, raspado de andén o desgaste. Restauramos color, brillo y textura con acabado idéntico al de fábrica.',
      en: 'Faded, curb-rashed or worn finishes. We restore colour, gloss and texture with a finish identical to factory.',
    },
  },
  {
    num: '04',
    icon: 'fabrication',
    title: { es: 'Fabricación a medida', en: 'Custom fabrication' },
    body: {
      es: 'Piezas y aros especiales hechos a la medida, cuando el repuesto no existe o se necesita personalizado.',
      en: "Special parts and wheels made to measure, when the part doesn't exist or must be customised.",
    },
  },
];

/** Reseñas verificadas (Inicio · Acto 3, marquee). */
export const REVIEWS: readonly Review[] = [
  {
    quote: {
      es: '«Quedaron mejor que nuevos. Altamente recomendados.»',
      en: '“Better than new. Highly recommended.”',
    },
    tag: { es: 'Aros VW Bora', en: 'VW Bora wheels' },
  },
  {
    quote: {
      es: '«No se distingue si el aro es reparado o nuevo. Excelente atención.»',
      en: "“You can't tell a repaired wheel from a new one. Excellent service.”",
    },
    tag: { es: 'Reparación de aro', en: 'Wheel repair' },
  },
  {
    quote: {
      es: '«Tan bueno como cualquier taller de aros en Estados Unidos.»',
      en: '“As good as any wheel-repair shop in the US.”',
    },
    tag: { es: 'Aros de aleación', en: 'Alloy wheels' },
  },
  {
    quote: {
      es: '«Bueno, bonito, barato y rápido. Volvería sin pensarlo.»',
      en: "“Good, sharp, affordable and fast. I'd go back without a doubt.”",
    },
    tag: { es: 'Servicio express', en: 'Express service' },
  },
  {
    quote: {
      es: '«Excelente trabajo y atención. Recomendado para trabajos finos.»',
      en: '“Excellent work and service. Recommended for fine work.”',
    },
    tag: { es: 'Trabajo fino', en: 'Fine work' },
  },
  {
    quote: {
      es: '«Los aros de mi Mercedes quedaron impecables.»',
      en: '“My Mercedes wheels came out flawless.”',
    },
    tag: { es: 'Aros Mercedes-Benz', en: 'Mercedes-Benz wheels' },
  },
];

const M = (es: string, en: string): { es: string; en: string } => ({ es, en });

/** Catálogo Orbital — aros a la venta (Servicios · Tienda). */
export const WHEELS: readonly Wheel[] = [
  {
    img: 'assets/aros-alex/ventas/v01.jpg',
    size: '15',
    badge: 'R15',
    name: 'Roner',
    finish: M('Grafito · borde diamantado', 'Grafito · borde diamantado'),
    dotColor: '#6b6e74',
    dotBorder: 'rgba(255,255,255,.45)',
    specs: [
      { label: M('Medida', 'Size'), value: '15×6.0' },
      { label: M('Pernos', 'Bolts'), value: '4×100' },
      { label: M('ET', 'ET'), value: '38' },
    ],
    whatsapp:
      'https://wa.me/50685602560?text=Hola%2C%20me%20interesa%20el%20aro%20Orbital%20Roner%2015%C3%976.0%20(4%C3%97100).%20%C2%BFDisponibilidad%20y%20precio%3F',
  },
  {
    img: 'assets/aros-alex/ventas/v02.jpg',
    size: '14',
    badge: 'R14',
    name: 'Tusar',
    finish: M('Negro · banda roja diamantada', 'Negro · banda roja diamantada'),
    dotColor: '#1a1a1a',
    dotBorder: '#E4022B',
    specs: [
      { label: M('Medida', 'Size'), value: '14×6.0' },
      { label: M('Pernos', 'Bolts'), value: '8×100/114.3' },
      { label: M('ET', 'ET'), value: '35' },
    ],
    whatsapp:
      'https://wa.me/50685602560?text=Hola%2C%20me%20interesa%20el%20aro%20Orbital%20Tusar%2014%C3%976.0%20(8%C3%97100%2F114.3).%20%C2%BFDisponibilidad%20y%20precio%3F',
  },
  {
    img: 'assets/aros-alex/ventas/v03.jpg',
    size: '15',
    badge: 'R15',
    name: 'Sport',
    finish: M('Grafito · borde diamantado', 'Grafito · borde diamantado'),
    dotColor: '#6b6e74',
    dotBorder: 'rgba(255,255,255,.45)',
    specs: [
      { label: M('Medida', 'Size'), value: '15"' },
      { label: M('Pernos', 'Bolts'), value: 'Consultar' },
    ],
    whatsapp:
      'https://wa.me/50685602560?text=Hola%2C%20me%20interesa%20el%20aro%20Orbital%20Sport%2015%22.%20%C2%BFDisponibilidad%20y%20precio%3F',
  },
  {
    img: 'assets/aros-alex/ventas/v04.jpg',
    size: '15',
    badge: 'R15',
    name: 'Lebrun',
    finish: M('Negro · borde diamantado', 'Negro · borde diamantado'),
    dotColor: '#1a1a1a',
    dotBorder: 'rgba(255,255,255,.4)',
    specs: [
      { label: M('Medida', 'Size'), value: '15×6.5' },
      { label: M('Pernos', 'Bolts'), value: '4×100' },
      { label: M('ET', 'ET'), value: '35' },
    ],
    whatsapp:
      'https://wa.me/50685602560?text=Hola%2C%20me%20interesa%20el%20aro%20Orbital%20Lebrun%2015%C3%976.5%20(4%C3%97100).%20%C2%BFDisponibilidad%20y%20precio%3F',
  },
  {
    img: 'assets/aros-alex/ventas/v05.jpg',
    size: '15',
    badge: 'R15',
    name: 'Yesterday Two',
    finish: M('Azul · borde diamantado', 'Azul · borde diamantado'),
    dotColor: '#2f7fd6',
    dotBorder: 'rgba(255,255,255,.5)',
    specs: [
      { label: M('Medida', 'Size'), value: '15×7.0' },
      { label: M('Pernos', 'Bolts'), value: '8×100/114.3' },
      { label: M('ET', 'ET'), value: '35' },
    ],
    whatsapp:
      'https://wa.me/50685602560?text=Hola%2C%20me%20interesa%20el%20aro%20Orbital%20Yesterday%20Two%2015%C3%977.0%20(8%C3%97100%2F114.3).%20%C2%BFDisponibilidad%20y%20precio%3F',
  },
  {
    img: 'assets/aros-alex/ventas/v06.jpg',
    size: '15',
    badge: 'R15',
    name: 'Yesterday Two',
    finish: M('Rojo · borde diamantado', 'Rojo · borde diamantado'),
    dotColor: '#E4022B',
    dotBorder: 'rgba(255,255,255,.5)',
    specs: [
      { label: M('Medida', 'Size'), value: '15×7.0' },
      { label: M('Pernos', 'Bolts'), value: '8×100/114.3' },
      { label: M('ET', 'ET'), value: '35' },
    ],
    whatsapp:
      'https://wa.me/50685602560?text=Hola%2C%20me%20interesa%20el%20aro%20Orbital%20Yesterday%20Two%2015%C3%977.0%20(8%C3%97100%2F114.3).%20%C2%BFDisponibilidad%20y%20precio%3F',
  },
  {
    img: 'assets/aros-alex/ventas/v07.jpg',
    size: '16',
    badge: 'R16',
    name: 'Morlen',
    finish: M('Grafito · borde diamantado', 'Grafito · borde diamantado'),
    dotColor: '#6b6e74',
    dotBorder: 'rgba(255,255,255,.45)',
    specs: [
      { label: M('Medida', 'Size'), value: '16×6.5' },
      { label: M('Pernos', 'Bolts'), value: '5×100' },
      { label: M('ET', 'ET'), value: '30' },
    ],
    whatsapp:
      'https://wa.me/50685602560?text=Hola%2C%20me%20interesa%20el%20aro%20Orbital%20Morlen%2016%C3%976.5%20(5%C3%97100).%20%C2%BFDisponibilidad%20y%20precio%3F',
  },
  {
    img: 'assets/aros-alex/ventas/v08.jpg',
    size: '16',
    badge: 'R16',
    name: 'Portier',
    finish: M('Hyper plata · borde diamantado', 'Hyper plata · borde diamantado'),
    dotColor: '#c4c8cc',
    dotBorder: 'rgba(255,255,255,.6)',
    specs: [
      { label: M('Medida', 'Size'), value: '16×7.0' },
      { label: M('Pernos', 'Bolts'), value: '5×114.3' },
      { label: M('ET', 'ET'), value: '38' },
    ],
    whatsapp:
      'https://wa.me/50685602560?text=Hola%2C%20me%20interesa%20el%20aro%20Orbital%20Portier%2016%C3%977.0%20(5%C3%97114.3).%20%C2%BFDisponibilidad%20y%20precio%3F',
  },
  {
    img: 'assets/aros-alex/ventas/v09.jpg',
    size: '14',
    badge: 'R14',
    name: 'Dongo',
    finish: M('Negro · borde diamantado', 'Negro · borde diamantado'),
    dotColor: '#1a1a1a',
    dotBorder: 'rgba(255,255,255,.4)',
    specs: [
      { label: M('Medida', 'Size'), value: '14×6.0' },
      { label: M('Pernos', 'Bolts'), value: '4×100' },
      { label: M('ET', 'ET'), value: '35' },
    ],
    whatsapp:
      'https://wa.me/50685602560?text=Hola%2C%20me%20interesa%20el%20aro%20Orbital%20Dongo%2014%C3%976.0%20(4%C3%97100).%20%C2%BFDisponibilidad%20y%20precio%3F',
  },
  {
    img: 'assets/aros-alex/ventas/v10.jpg',
    size: '15',
    badge: 'R15',
    name: 'Yesterday Seven',
    finish: M('Bronce · borde diamantado', 'Bronce · borde diamantado'),
    dotColor: '#9a6b34',
    dotBorder: 'rgba(255,255,255,.5)',
    specs: [
      { label: M('Medida', 'Size'), value: '15×7.0' },
      { label: M('Pernos', 'Bolts'), value: '8×100/114.3' },
      { label: M('ET', 'ET'), value: '35' },
    ],
    whatsapp:
      'https://wa.me/50685602560?text=Hola%2C%20me%20interesa%20el%20aro%20Orbital%20Yesterday%20Seven%2015%C3%977.0%20(8%C3%97100%2F114.3).%20%C2%BFDisponibilidad%20y%20precio%3F',
  },
  {
    img: 'assets/aros-alex/ventas/v11.jpg',
    size: '16',
    badge: 'R16',
    name: 'Morlen',
    finish: M('Negro · borde diamantado', 'Negro · borde diamantado'),
    dotColor: '#1a1a1a',
    dotBorder: 'rgba(255,255,255,.4)',
    specs: [
      { label: M('Medida', 'Size'), value: '16×6.5' },
      { label: M('Pernos', 'Bolts'), value: '5×114.3' },
      { label: M('ET', 'ET'), value: '30' },
    ],
    whatsapp:
      'https://wa.me/50685602560?text=Hola%2C%20me%20interesa%20el%20aro%20Orbital%20Morlen%2016%C3%976.5%20(5%C3%97114.3).%20%C2%BFDisponibilidad%20y%20precio%3F',
  },
  {
    img: 'assets/aros-alex/ventas/v12.jpg',
    size: '14',
    badge: 'R14',
    name: 'Aielli',
    finish: M('Grafito mate · diamantado', 'Grafito mate · diamantado'),
    dotColor: '#5a5d63',
    dotBorder: 'rgba(255,255,255,.4)',
    specs: [
      { label: M('Medida', 'Size'), value: '14×6.0' },
      { label: M('Pernos', 'Bolts'), value: '4×100' },
      { label: M('ET', 'ET'), value: '35' },
    ],
    whatsapp:
      'https://wa.me/50685602560?text=Hola%2C%20me%20interesa%20el%20aro%20Orbital%20Aielli%2014%C3%976.0%20(4%C3%97100).%20%C2%BFDisponibilidad%20y%20precio%3F',
  },
  {
    img: 'assets/aros-alex/ventas/v13.jpg',
    size: '15',
    badge: 'R15',
    name: 'Sirio',
    finish: M('Negro · borde diamantado', 'Negro · borde diamantado'),
    dotColor: '#1a1a1a',
    dotBorder: 'rgba(255,255,255,.4)',
    specs: [
      { label: M('Medida', 'Size'), value: '15×7.0' },
      { label: M('Pernos', 'Bolts'), value: '8×100/114.3' },
      { label: M('ET', 'ET'), value: '38' },
    ],
    whatsapp:
      'https://wa.me/50685602560?text=Hola%2C%20me%20interesa%20el%20aro%20Orbital%20Sirio%2015%C3%977.0%20(8%C3%97100%2F114.3).%20%C2%BFDisponibilidad%20y%20precio%3F',
  },
  {
    img: 'assets/aros-alex/ventas/v14.jpg',
    size: '15',
    badge: 'R15',
    name: 'Roner',
    finish: M('Negro · borde diamantado', 'Negro · borde diamantado'),
    dotColor: '#1a1a1a',
    dotBorder: 'rgba(255,255,255,.4)',
    specs: [
      { label: M('Medida', 'Size'), value: '15×6.0' },
      { label: M('Pernos', 'Bolts'), value: '4×100' },
      { label: M('ET', 'ET'), value: '38' },
    ],
    whatsapp:
      'https://wa.me/50685602560?text=Hola%2C%20me%20interesa%20el%20aro%20Orbital%20Roner%2015%C3%976.0%20(4%C3%97100).%20%C2%BFDisponibilidad%20y%20precio%3F',
  },
];

export const WHEEL_FILTERS: readonly Filter[] = [
  { id: 'todos', label: { es: 'Todos', en: 'All' } },
  { id: '14', label: { es: '14"', en: '14"' } },
  { id: '15', label: { es: '15"', en: '15"' } },
  { id: '16', label: { es: '16"', en: '16"' } },
];

/** Galería antes / después. */
export const GALLERY: readonly GalleryItem[] = [
  {
    category: 'reparacion',
    jobNum: '01',
    icon: 'link',
    title: { es: 'Aro reventado restaurado', en: 'Cracked wheel restored' },
    beforeImg: 'assets/aros-alex/reparaciones/reventado-antes.png',
    afterImg: 'assets/aros-alex/reparaciones/reventado-despues.png',
    caption: { es: 'Reparación', en: 'Repair' },
  },
  {
    category: 'enderezado',
    jobNum: '02',
    icon: 'expand',
    title: { es: 'Aro torcido enderezado', en: 'Bent wheel straightened' },
    beforeImg: 'assets/aros-alex/reparaciones/torcido-antes.png',
    afterImg: 'assets/aros-alex/reparaciones/torcido-despues.png',
    caption: { es: 'Enderezado', en: 'Straightening' },
  },
  {
    category: 'reparacion',
    jobNum: '03',
    icon: 'link',
    title: { es: 'Grieta soldada y sellada', en: 'Crack welded & sealed' },
    beforeImg: 'assets/aros-alex/reparaciones/grieta-antes.png',
    afterImg: 'assets/aros-alex/reparaciones/grieta-despues.png',
    caption: { es: 'Reparación', en: 'Repair' },
  },
  {
    category: 'pintura',
    jobNum: '04',
    icon: 'roller',
    title: { es: 'Raspado de andén corregido', en: 'Curb rash corrected' },
    beforeImg: 'assets/aros-alex/reparaciones/raspado-antes.png',
    afterImg: 'assets/aros-alex/reparaciones/raspado-despues.png',
    caption: { es: 'Rectificado', en: 'Refinish' },
  },
  {
    category: 'pintura',
    jobNum: '05',
    icon: 'roller',
    title: { es: 'Restauración de pintura', en: 'Paint restoration' },
    beforeImg: 'assets/aros-alex/reparaciones/pintura-antes.png',
    afterImg: 'assets/aros-alex/reparaciones/pintura-despues.png',
    caption: { es: 'Pintura', en: 'Paint' },
  },
];

export const GALLERY_FILTERS: readonly Filter[] = [
  { id: 'todos', label: { es: 'Todos', en: 'All' } },
  { id: 'reparacion', label: { es: 'Reparación', en: 'Repair' } },
  { id: 'enderezado', label: { es: 'Enderezado', en: 'Straightening' } },
  { id: 'pintura', label: { es: 'Pintura', en: 'Paint' } },
];

/** Horario de atención (CR · UTC−6). `days`: 0 = domingo. */
export const HOURS: readonly HoursRow[] = [
  {
    days: [1, 2, 3, 4, 5],
    label: { es: 'Lunes a viernes', en: 'Monday to Friday' },
    value: { es: '7:30 – 17:00', en: '7:30 – 17:00' },
    closed: false,
  },
  {
    days: [6],
    label: { es: 'Sábado', en: 'Saturday' },
    value: { es: '8:00 – 13:00', en: '8:00 – 13:00' },
    closed: false,
  },
  {
    days: [0],
    label: { es: 'Domingo', en: 'Sunday' },
    value: { es: 'Cerrado', en: 'Closed' },
    closed: true,
  },
];
