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

export const NAV_LINKS: readonly string[] = [
  'Models',
  'Performance',
  'Design',
  'Technology',
  'Ownership',
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

export const PRESS_LOGOS: readonly string[] = [
  'Forbes',
  'Motor Trend',
  'Top Gear',
  'Road & Track',
  'Car & Driver',
  'Robb Report',
];

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
