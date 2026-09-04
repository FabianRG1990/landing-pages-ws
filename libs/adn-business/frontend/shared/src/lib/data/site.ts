/**
 * Contenido de ADN Business.
 * Los programas, modulos y entregables son los reales publicados por el
 * cliente; los titulares y el microcopy estan reescritos. No hay ninguna
 * cifra de resultados inventada: las dos del diagnostico son las que ADN 365
 * publica en adn365.com.pe.
 */

export const SITE = {
  marca: 'ADN Business',
  lema: 'Potencia · Transforma · Impacta',
  matriz: 'ADN 365 S.A.',
  ciudad: 'Lima, Perú',
  whatsapp: 'https://wa.link/6z1rqc',
  telefono: '+51 961 965 723',
} as const;

export const NAV = [
  { etiqueta: 'Diagnóstico', ancla: '#diagnostico' },
  { etiqueta: 'Ejes', ancla: '#ejes' },
  { etiqueta: 'Programas', ancla: '#programas' },
  { etiqueta: 'Servicios', ancla: '#servicios' },
  { etiqueta: 'Contacto', ancla: '#contacto' },
] as const;

export const HERO = {
  eyebrow: 'Unidad de ADN 365',
  titulo1: 'La estructura',
  titulo2: 'que su crecimiento',
  titulo3: 'todavía no tiene',
  entrada:
    'Gobernanza, talento y capital para empresas peruanas que ya facturan y necesitan dejar de improvisar para poder escalar.',
  ctaPrimario: 'Solicitar diagnóstico',
  ctaSecundario: 'Ver los tres ejes',
  meta: [
    { k: 'Base', v: 'Lima · toda Latinoamérica' },
    { k: 'Primera asesoría', v: '60 min · sin costo' },
    { k: 'Acompañamiento', v: 'Desde 6 meses' },
  ],
} as const;

export const DIAGNOSTICO = {
  eyebrow: 'El punto de partida',
  titulo: 'El problema no es la falta de ideas.',
  entrada:
    'Es la falta de estructura. En el Perú abundan las empresas con tracción real que se frenan en el mismo punto: decisiones concentradas en una persona, equipos sin objetivos medibles y cuentas que no resisten una due diligence.',
  cifras: [
    {
      valor: 8,
      sufijo: ' de cada 10',
      titulo: 'startups fracasan',
      detalle: 'antes de cumplir dos años, por falta de capital y de validación de mercado.',
    },
    {
      valor: 70,
      sufijo: '%',
      titulo: 'de las pymes',
      detalle: 'no logra crecer ni acceder a financiamiento formal pese a tener demanda.',
    },
  ],
  fuente: 'Diagnóstico de mercado publicado por ADN 365',
} as const;

/**
 * Los tres ejes. Cada uno enlaza con el programa que lo ejecuta: la
 * estructura de la oferta es la misma que la estructura del argumento.
 */
export const EJES = [
  {
    n: '01',
    clave: 'gobernanza',
    titulo: 'Gobernanza',
    frase: 'Quién decide, con qué información y con qué frecuencia.',
    detalle:
      'Un directorio que se reúne, un plan a tres años y un tablero de control. Sin eso, cada decisión depende de una sola persona y la empresa no puede crecer más rápido que ella.',
    programa: 'ADN Board 365',
    entrega: 'Reglamento de directorio · Plan 3–5 años · KPI dashboard',
  },
  {
    n: '02',
    clave: 'talento',
    titulo: 'Talento',
    frase: 'Quién ejecuta, contra qué objetivo y con qué resultado.',
    detalle:
      'Auditoría del equipo, objetivos por área con OKR u OGSM y un plan de formación. El talento sin objetivos medibles se convierte en rotación.',
    programa: 'ADN Evolution',
    entrega: 'Plan de talento · KPIs de clima y desempeño · Roadmap',
  },
  {
    n: '03',
    clave: 'capital',
    titulo: 'Capital',
    frase: 'Con qué se financia el siguiente tramo de crecimiento.',
    detalle:
      'Data room, due diligence inicial y una carpeta de inversión que resista preguntas. El capital llega cuando las cuentas y el gobierno ya están ordenados, no antes.',
    programa: 'ADN Investment',
    entrega: 'Carpeta de inversión · Perfiles de inversionistas · Negociación',
  },
] as const;

export const EJES_INTRO = {
  eyebrow: 'Cómo trabajamos',
  titulo: 'Tres ejes que se sostienen entre sí.',
  entrada:
    'No son servicios sueltos. Es una estructura: sin gobierno no hay objetivos, sin objetivos no hay resultados que mostrar, y sin resultados no hay capital.',
} as const;

/**
 * Los tres programas como tabla comparativa: es la forma en que un
 * consultor de gobernanza presenta una oferta, y evita la fila de tres
 * tarjetas iguales que tenia el sitio anterior.
 */
export const PROGRAMAS = {
  eyebrow: 'Los programas',
  titulo: 'Qué contrata exactamente.',
  entrada:
    'Los tres se complementan y lo habitual es empezar por gobernanza y talento, y avanzar a capital cuando la empresa está lista.',
  columnas: [
    { clave: 'board', nombre: 'ADN Board 365', eje: 'Gobernanza' },
    { clave: 'evolution', nombre: 'ADN Evolution', eje: 'Talento' },
    { clave: 'investment', nombre: 'ADN Investment', eje: 'Capital' },
  ],
  filas: [
    {
      etiqueta: 'Objetivo',
      valores: [
        'Profesionalizar la toma de decisiones con un directorio efectivo y asesoría continua.',
        'Transformar equipos, procesos y liderazgo con gestión de alto rendimiento.',
        'Estructurar el capital y conectar con los socios inversionistas de su etapa.',
      ],
    },
    {
      etiqueta: 'Módulos',
      valores: [
        'Diagnóstico de gobernanza · Conformación de directorio · KPIs estratégicos · Sucesión y control de gestión',
        'Auditoría de talento · Plan de formación · Marketing y producto · Gestión por objetivos (OKR/OGSM)',
        'Data room y documentación · Due diligence inicial',
      ],
    },
    {
      etiqueta: 'Entregables',
      valores: [
        'Reglamento de directorio · Plan estratégico 3–5 años · Tablero de control',
        'Plan de talento · KPIs de clima y desempeño · Roadmap de innovación',
        'Carpeta de inversión · Perfiles de inversionistas priorizados · Gestión de negociaciones',
      ],
    },
    {
      etiqueta: 'Formato',
      valores: [
        'Acompañamiento continuo · desde 6 meses',
        'Acompañamiento continuo · desde 6 meses',
        'Por proceso · según etapa',
      ],
    },
  ],
} as const;

export const SERVICIOS = {
  eyebrow: 'Alrededor del núcleo',
  titulo: 'Lo que sostiene la operación.',
  complementarios: [
    {
      nombre: 'Servicios Legales para Pymes',
      detalle: 'Constitución, cumplimiento y defensa. La formalidad es requisito para el capital.',
    },
    {
      nombre: 'Top Talent',
      detalle: 'Cultura, compromiso y gestión del talento en equipos que ya crecieron.',
    },
    {
      nombre: 'Safe Work',
      detalle: 'Sistemas de Seguridad y Salud en el Trabajo conformes a la normativa peruana.',
    },
  ],
  exportacion: {
    titulo: 'Y si el siguiente mercado está fuera del Perú',
    items: [
      'Desarrollo de producto y empaque para exportación',
      'Acceso a canales de venta B2B y B2C',
      'Estrategias de pricing y posicionamiento',
      'Gestión de certificaciones de calidad e inocuidad',
      'Apoyo en ferias y ruedas de negocio',
    ],
  },
} as const;

export const CONTACTO = {
  eyebrow: 'El siguiente paso',
  titulo: 'Una hora, sin costo, para ver dónde está el cuello de botella.',
  entrada:
    'Escuchamos su situación, identificamos los puntos que frenan el crecimiento y le presentamos un diagnóstico inicial con las rutas de trabajo. Sin compromiso.',
  garantias: ['Primera asesoría sin costo', '60 minutos', 'Respuesta en menos de 24 h'],
  programas: ['ADN Board 365', 'ADN Evolution', 'ADN Investment', 'Servicios complementarios', 'Aún no lo sé'],
} as const;
