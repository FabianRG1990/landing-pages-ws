import {
  AboutStat,
  GalleryCategory,
  GalleryItem,
  NavItem,
  Review,
  ScheduleRow,
  ServiceItem,
} from '../core/models';

export const NAV: NavItem[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'galeria', label: 'Galería' },
  { id: 'nosotros', label: 'Nosotros' },
  { id: 'contacto', label: 'Contacto' },
];

/** Catálogo canónico de servicios (también alimenta el diálogo de cita y el PDF). */
export const SERVICES: ServiceItem[] = [
  {
    key: 'mecanica',
    title: 'Mecánica general',
    description:
      'Mantenimiento preventivo completo: motor, fajas, filtros y fluidos. Detectamos a tiempo lo que otros dejan pasar.',
    short: 'Motor, fajas, filtros y fluidos.',
    icon: [
      'M14.7 6.3a3.5 3.5 0 00-4.7 4.5l-6.3 6.3a1.8 1.8 0 002.5 2.5l6.3-6.3a3.5 3.5 0 004.5-4.7l-2 2-2-.5-.5-2 2-2z',
      'M15.5 15.5l3.5 3.5',
    ],
  },
  {
    key: 'preventivo',
    title: 'Mantenimiento preventivo',
    description:
      'Revisión periódica programada para que tu carro nunca te deje botado. Cuidamos cada punto clave.',
    short: 'Revisión periódica programada.',
    icon: ['M9 11l2 2 4-4', 'M12 3a9 9 0 100 18 9 9 0 000-18z'],
  },
  {
    key: 'scanner',
    title: 'Diagnóstico por scanner',
    description:
      'Lectura computarizada de la ECU para leer los códigos reales del vehículo. Nada de adivinar.',
    short: 'Lectura computarizada de la ECU.',
    icon: ['M2.5 4.5h19v12h-19z', 'M6 20h12M12 16.5V20', 'M6 10.5l2.5-2 2 3 2-4 2 3H18'],
  },
  {
    key: 'frenos',
    title: 'Frenos y suspensión',
    description:
      'Pastillas, discos, amortiguadores y tren delantero. Tu seguridad empieza por aquí.',
    short: 'Pastillas, discos y amortiguadores.',
    icon: ['M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17z', 'M12 9a3 3 0 100 6 3 3 0 000-6z'],
  },
  {
    key: 'aceite',
    title: 'Cambio de aceite',
    description:
      'Aceite y filtro con el grado exacto que pide tu motor, más engrase de puntos clave.',
    short: 'Aceite y filtro al grado correcto.',
    icon: ['M12 3c2.5 3.5 4.5 6 4.5 8.5a4.5 4.5 0 01-9 0C7.5 9 9.5 6.5 12 3z'],
  },
  {
    key: 'aire',
    title: 'Aire acondicionado',
    description:
      'Servicio y reparación del A/C: recarga de gas, compresor, fugas y filtros. Recuperamos el frío.',
    short: 'Servicio, recarga de gas y compresor.',
    icon: ['M12 3v18', 'M4.5 7.5l15 9', 'M19.5 7.5l-15 9', 'M9 4l3 2 3-2', 'M9 20l3-2 3 2'],
  },
  {
    key: 'electricidad',
    title: 'Electricidad automotriz',
    description:
      'Sistema eléctrico, alternador, batería y luces. Dejamos todo funcionando como debe.',
    short: 'Alternador, batería y luces.',
    icon: ['M13 2L5 13h6l-1 9 9-12h-6z'],
  },
  {
    key: 'rtv',
    title: 'Preparación para RTV',
    description:
      'Dejamos tu carro listo para pasar la Revisión Técnica: luces, gases, frenos y todo lo que revisan.',
    short: 'Listo para la Revisión Técnica.',
    icon: ['M6 3h9l3 3v15H6z', 'M9.5 12.5l1.8 1.8 3.4-3.6'],
  },
  {
    key: 'domicilio',
    title: 'Servicio a domicilio',
    description:
      'Traslado de tu vehículo en plataforma, o recogida y entrega. Vamos hasta donde estés.',
    short: 'Recogida y entrega de tu vehículo.',
    icon: [
      'M2.5 15V8h9v7',
      'M11.5 10h4l3 3v2h-2.5',
      'M2.5 15h4',
      'M8 16.5a1.8 1.8 0 100 .1',
      'M16.5 16.5a1.8 1.8 0 100 .1',
    ],
  },
];

/** Servicios que aparecen en el zig-zag de la página de inicio. */
export const HOME_SERVICE_KEYS = ['mecanica', 'scanner', 'frenos', 'aire'];
export const HOME_SERVICE_IMAGES: Record<string, string> = {
  mecanica: 'assets/mecanica-general.jpg',
  scanner: 'assets/scanner.jpg',
  frenos: 'assets/frenos.jpg',
  aire: 'assets/aire.jpg',
};

export const GALLERY_CATEGORIES: GalleryCategory[] = [
  { key: 'mecanica', label: 'Mecánica' },
  { key: 'scanner', label: 'Escáner' },
  { key: 'frenos', label: 'Frenos' },
  { key: 'aire', label: 'Aire acondicionado' },
  { key: 'equipo', label: 'Nuestro equipo' },
];

export const GALLERY_ITEMS: GalleryItem[] = [
  { id: 'gal-0', category: 'mecanica', src: 'assets/mecanica-general.jpg', featured: true },
  { id: 'gal-1', category: 'mecanica', src: '' },
  { id: 'gal-2', category: 'mecanica', src: '' },
  { id: 'gal-3', category: 'scanner', src: 'assets/scanner.jpg', featured: true },
  { id: 'gal-4', category: 'scanner', src: '' },
  { id: 'gal-5', category: 'frenos', src: 'assets/frenos.jpg', featured: true },
  { id: 'gal-6', category: 'frenos', src: '' },
  { id: 'gal-7', category: 'aire', src: 'assets/aire.jpg', featured: true },
  { id: 'gal-8', category: 'aire', src: '' },
  { id: 'gal-9', category: 'equipo', src: 'assets/equipo.jpg', featured: true },
  { id: 'gal-10', category: 'equipo', src: '' },
];

export const REVIEWS: Review[] = [
  { name: 'Andrés M.', kind: 'fb', text: 'Excelentes, muy honestos. Me explicaron todo antes de trabajar y el precio fue justo. 100% recomendados.' },
  { name: 'María F.', kind: 'ig', text: 'Me dejaron el aire acondicionado como nuevo, enfría durísimo otra vez. Atención de primera.' },
  { name: 'Jose R.', kind: 'google', text: 'Rápidos y claros con el diagnóstico. Mi taller de confianza en Heredia, sin duda.' },
  { name: 'Kimberly S.', kind: 'fb', text: 'Súper amables y profesionales. Me hicieron el servicio completo y quedó impecable.' },
  { name: 'Carlos V.', kind: 'google', text: 'Llevé el carro por un ruido en los frenos, lo resolvieron el mismo día. Muy recomendados.' },
  { name: 'Daniela C.', kind: 'ig', text: 'Confianza total. Te explican qué necesita el carro y qué no, sin trabajos de más.' },
  { name: 'Luis A.', kind: 'google', text: 'El scanner detectó la falla al toque. Trabajo limpio y buen trato. Volveré.' },
  { name: 'Natalia P.', kind: 'fb', text: 'De los mejores talleres de la zona. Serios, puntuales y con buenos precios.' },
];

export const ABOUT_STATS: AboutStat[] = [
  { title: 'Honestidad', detail: 'Te decimos lo que necesita —y lo que no.' },
  { title: 'Mecánica + Transporte', detail: 'Taller físico y traslado en plataforma.' },
  { title: 'Atención directa', detail: 'Hablás con quien repara tu carro.' },
  { title: 'Heredia', detail: 'Santo Domingo · San Miguel' },
];

export const VALUES: AboutStat[] = [
  { title: 'Honestidad', detail: 'Te decimos lo que tu carro necesita —y lo que no. Sin trabajos de más.' },
  { title: 'Cuidado', detail: 'Tratamos cada vehículo con el respeto y la atención de uno propio.' },
  { title: 'Cercanía', detail: 'Atención directa y personal. Aquí hablás con quien repara tu carro.' },
  { title: 'Rapidez', detail: 'Resolvemos a tiempo, sin sacrificar la calidad del trabajo.' },
];

export const SCHEDULE: ScheduleRow[] = [
  { day: 'Lunes a Viernes', hours: '8:00 a. m. – 6:00 p. m.' },
  { day: 'Sábado', hours: 'Cerrado', closed: true },
  { day: 'Domingo', hours: 'Cerrado', closed: true },
];

/** Marquesina de servicios que corre en el hero. */
export const TICKER = [
  'Mecánica general', 'Diagnóstico scanner', 'Frenos', 'Cambio de aceite',
  'Aire acondicionado', 'RTV', 'Electricidad', 'A domicilio',
];

/** Franjas horarias del formulario según el momento del día. */
export const HOUR_SLOTS: Record<string, string[]> = {
  'Mañana': ['8:00 a. m.', '9:00 a. m.', '10:00 a. m.', '11:00 a. m.'],
  'Tarde': ['1:00 p. m.', '2:00 p. m.', '3:00 p. m.', '4:00 p. m.', '5:00 p. m.'],
};
