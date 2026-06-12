/* ============================================================
   VELOX — datos de contenido compartidos por la landing.
   (Equivale a las constantes FEATURES / NAV_LINKS / PRESS_LOGOS /
   FOOTER_COLS del index.html original en React.)
   ============================================================ */

/** Clave de ícono inline resuelta en el template vía @switch. */
export type FeatureIcon =
  | 'speed'
  | 'craft'
  | 'shield'
  | 'star'
  | 'person'
  | 'leaf';

export interface Feature {
  readonly icon: FeatureIcon;
  readonly title: string;
  readonly desc: string;
}

export interface HeroStat {
  readonly value: string;
  readonly label: string;
}

export interface FooterColumn {
  readonly heading: string;
  readonly links: readonly string[];
}

export interface Model {
  readonly name: string;
  readonly tagline: string;
  readonly image: string;
  readonly spec: string;
  readonly note: string;
}

export interface DesignDetail {
  readonly label: string;
  readonly value: string;
}

export interface PerfStat {
  readonly value: number;
  readonly decimals: number;
  readonly suffix: string;
  readonly label: string;
}

export interface NavLink {
  readonly label: string;
  /** Selector CSS del segmento destino (scroll suave en la misma página). */
  readonly target: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { label: 'Inicio', target: '/inicio' },
  { label: 'Performance', target: '/performance' },
  { label: 'Design', target: '/design' },
  { label: 'Technology', target: '/technology' },
  { label: 'Ownership', target: '/ownership' },
];

export const HERO_STATS: readonly HeroStat[] = [
  { value: '2.8s', label: '0–60 mph' },
  { value: '850', label: 'Horsepower' },
  { value: '480mi', label: 'Total Range' },
];

export const FEATURES: readonly Feature[] = [
  {
    icon: 'speed',
    title: '0–60 in 2.8 Seconds',
    desc: 'Twin-turbo V12 with 850 horsepower delivers acceleration that permanently resets your threshold for fast.',
  },
  {
    icon: 'craft',
    title: 'Hand-Stitched Interiors',
    desc: 'Every cabin is tailored by master craftsmen using full-grain Italian leather, cold-forged aluminum, and rare hardwoods.',
  },
  {
    icon: 'shield',
    title: 'Adaptive Safety Suite',
    desc: '360-degree sensor fusion, predictive braking, and active chassis control keep you sovereign on every road.',
  },
  {
    icon: 'star',
    title: 'Bespoke Configuration',
    desc: 'More than 3,200 paint, trim, and performance combinations — your VELOX is unlike any other on earth.',
  },
  {
    icon: 'person',
    title: 'Lifetime Concierge',
    desc: 'A dedicated specialist is available around the clock for service, routing, reservations, and anything the road demands.',
  },
  {
    icon: 'leaf',
    title: 'Hybrid Powertrain',
    desc: 'Electric torque fills every gear gap, with a combined range of 480 miles and a zero-emission city mode.',
  },
];

/* ── The Lineup (galería de modelos) ── */
export const MODELS: readonly Model[] = [
  {
    name: 'VELOX GT',
    tagline: 'The grand tourer',
    image: 'stills/model-gt.webp',
    spec: '850 hp',
    note: 'Twin-turbo V12 · Grand Touring',
  },
  {
    name: 'VELOX Sport',
    tagline: 'The track-bred',
    image: 'stills/model-sport.webp',
    spec: '2.8s',
    note: '0–60 mph · Carbon aero',
  },
  {
    name: 'VELOX Noir',
    tagline: 'The bespoke edition',
    image: 'stills/model-noir.webp',
    spec: '99',
    note: 'Hand-finished · Limited worldwide',
  },
];

/* ── Design (editorial) ── */
export const DESIGN_DETAILS: readonly DesignDetail[] = [
  { label: 'Cabin', value: 'Full-grain Italian leather, hand-stitched' },
  { label: 'Structure', value: 'Cold-forged aluminium monocoque' },
  { label: 'Wheels', value: '23" forged, diamond-polished' },
  { label: 'Finish', value: 'Liquid-metal champagne, 14-stage paint' },
];

/* ── Performance (banda con contadores) ── */
export const PERF_STATS: readonly PerfStat[] = [
  { value: 850, decimals: 0, suffix: '', label: 'Horsepower' },
  { value: 2.8, decimals: 1, suffix: 's', label: '0–60 mph' },
  { value: 190, decimals: 0, suffix: '', label: 'Top speed · mph' },
  { value: 480, decimals: 0, suffix: '', label: 'Total range · mi' },
];

export const PRESS_LOGOS: readonly string[] = [
  'Forbes',
  'Motor Trend',
  'Top Gear',
  'Road & Track',
  'Car & Driver',
  'Robb Report',
];

/* ── Testimonial ── */
export interface Testimonial {
  readonly quote: string;
  readonly author: string;
  readonly role: string;
}

export const TESTIMONIAL: Testimonial = {
  quote:
    'I have driven everything money can buy. The VELOX is the first that made me forget the price and remember the road.',
  author: 'Aria Castellano',
  role: 'Collector · Monaco',
};

export const FOOTER_COLS: readonly FooterColumn[] = [
  {
    heading: 'Vehicles',
    links: [
      'VELOX GT',
      'VELOX Touring',
      'VELOX Sport',
      'VELOX Hybrid',
      'Coming 2027',
    ],
  },
  {
    heading: 'Ownership',
    links: [
      'Test Drive',
      'Financing',
      'Warranty',
      'Service Centers',
      'Roadside Assist',
    ],
  },
  {
    heading: 'Company',
    links: [
      'About VELOX',
      'Press Room',
      'Careers',
      'Sustainability',
      'Contact Us',
    ],
  },
];

export const FOOTER_LEGAL: readonly string[] = [
  'Privacy Policy',
  'Terms of Use',
  'Cookie Settings',
];
