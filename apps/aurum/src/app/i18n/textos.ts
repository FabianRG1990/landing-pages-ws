// Contenido de relleno de Aurum en español e inglés. Los dos diccionarios
// comparten el tipo Textos: si a uno le falta una clave, no compila.

/** Un trozo de titular: texto plano o una palabra acentuada en oro. */
export type Trozo = string | { readonly oro: string };
/** Un renglón de titular; cada renglón entra por separado. */
export type Linea = readonly Trozo[];

export type CodigoIdioma = 'es' | 'en';

export interface Cifra {
  readonly valor: number;
  readonly decimales: number;
  readonly sufijo: string;
  readonly texto: string;
}

export interface Textos {
  readonly meta: { readonly titulo: string; readonly descripcion: string };
  readonly ui: {
    readonly saltar: string;
    readonly grupoIdioma: string;
    readonly pausar: string;
    readonly reanudar: string;
    readonly progreso: string;
    readonly inicio: string;
    readonly navegacion: string;
  };
  readonly nav: {
    readonly servicios: string;
    readonly metodo: string;
    readonly resultados: string;
    readonly demo: string;
  };
  readonly hero: {
    readonly etiqueta: string;
    readonly titulo: readonly Linea[];
    readonly lead: string;
    readonly cta: string;
    readonly ctaSecundario: string;
    readonly datos: readonly {
      readonly valor: string;
      readonly texto: string;
    }[];
    readonly desliza: string;
  };
  readonly servicios: {
    readonly etiqueta: string;
    readonly titulo: readonly Linea[];
    readonly lead: string;
    readonly items: readonly {
      readonly titulo: string;
      readonly texto: string;
      readonly canales: string;
    }[];
  };
  readonly metodo: {
    readonly etiqueta: string;
    readonly titulo: readonly Linea[];
    readonly lead: string;
    readonly pasos: readonly {
      readonly titulo: string;
      readonly texto: string;
      readonly plazo: string;
    }[];
  };
  readonly resultados: {
    readonly etiqueta: string;
    readonly titulo: readonly Linea[];
    readonly lead: string;
    readonly cifras: readonly Cifra[];
    readonly cita: {
      readonly texto: string;
      readonly autor: string;
      readonly cargo: string;
    };
    readonly nota: string;
  };
  readonly pie: {
    readonly titulo: readonly Linea[];
    readonly lead: string;
    readonly cta: string;
    readonly correo: string;
    readonly columnas: readonly {
      readonly titulo: string;
      readonly enlaces: readonly string[];
    }[];
    readonly derechos: string;
    readonly demo: string;
  };
}

export const TEXTOS: Readonly<Record<CodigoIdioma, Textos>> = {
  es: {
    meta: {
      titulo: 'Aurum — Agente de marketing',
      descripcion:
        'Aurum es un agente de marketing que planifica, crea y optimiza tus campañas todos los días.',
    },
    ui: {
      saltar: 'Saltar al contenido',
      grupoIdioma: 'Idioma',
      pausar: 'Pausar el movimiento del fondo',
      reanudar: 'Reanudar el movimiento del fondo',
      progreso: 'Secciones de la página',
      inicio: 'Aurum, inicio',
      navegacion: 'Principal',
    },
    nav: {
      servicios: 'Servicios',
      metodo: 'Método',
      resultados: 'Resultados',
      demo: 'Agenda una demo',
    },
    hero: {
      etiqueta: 'Agente de marketing',
      titulo: [
        ['Marketing que trabaja'],
        ['con ', { oro: 'precisión' }, ' de metal.'],
      ],
      lead: 'Aurum planifica, crea y optimiza tus campañas cada día. Un solo agente conectado a tus datos, con el criterio de un equipo senior y la constancia de una máquina.',
      cta: 'Agenda una demo',
      ctaSecundario: 'Ver cómo funciona',
      datos: [
        { valor: '24/7', texto: 'Operación continua' },
        { valor: '12', texto: 'Canales conectados' },
        { valor: '14 días', texto: 'De la firma al primer informe' },
      ],
      desliza: 'Desliza',
    },
    servicios: {
      etiqueta: '01 — Servicios',
      titulo: [['Un solo agente.'], ['Todo tu ', { oro: 'embudo.' }]],
      lead: 'Cuatro frentes que normalmente reparten tres agencias y un equipo interno. Aurum los coordina con una sola estrategia y un solo informe.',
      items: [
        {
          titulo: 'Estrategia y planificación',
          texto:
            'Analiza tu mercado y tu competencia, define audiencias y arma el plan de medios con objetivos que se pueden medir.',
          canales: 'Investigación · Audiencias · Plan de medios',
        },
        {
          titulo: 'Contenido y creatividad',
          texto:
            'Redacta, adapta y pone a prueba piezas para cada canal sin perder la voz de tu marca.',
          canales: 'Copy · Piezas · Pruebas A/B',
        },
        {
          titulo: 'Campañas y pauta',
          texto:
            'Lanza, reparte el presupuesto y ajusta las pujas en tiempo real según lo que de verdad convierte.',
          canales: 'Meta · Google · LinkedIn',
        },
        {
          titulo: 'Análisis e informes',
          texto:
            'Convierte los datos en decisiones: un informe claro cada lunes, sin hojas de cálculo ni jerga.',
          canales: 'Atribución · Paneles · Informe semanal',
        },
      ],
    },
    metodo: {
      etiqueta: '02 — Método',
      titulo: [['Tres pasos.'], [{ oro: 'Cero' }, ' improvisación.']],
      lead: 'Antes de mover un solo peso del presupuesto, Aurum entiende tu negocio. Después opera todos los días y rinde cuentas cada semana.',
      pasos: [
        {
          titulo: 'Conecta',
          texto:
            'Integramos tus cuentas publicitarias, tu CRM y tu analítica. Sin migraciones ni cambios en tu equipo.',
          plazo: 'Día 1–3',
        },
        {
          titulo: 'Calibra',
          texto:
            'El agente aprende tu marca, tus márgenes y tus metas, y te propone un plan que apruebas tú.',
          plazo: 'Día 4–14',
        },
        {
          titulo: 'Escala',
          texto:
            'Opera a diario, reporta cada semana y mueve el presupuesto hacia lo que funciona.',
          plazo: 'Desde el día 15',
        },
      ],
    },
    resultados: {
      etiqueta: '03 — Resultados',
      titulo: [['Números que'], ['se ', { oro: 'sostienen.' }]],
      lead: 'Medimos lo mismo que mide tu dirección financiera. Nada de métricas de vanidad.',
      cifras: [
        {
          valor: 38,
          decimales: 0,
          sufijo: ' %',
          texto: 'más retorno sobre la inversión publicitaria',
        },
        {
          valor: 3.2,
          decimales: 1,
          sufijo: '×',
          texto: 'más piezas puestas a prueba cada mes',
        },
        {
          valor: 61,
          decimales: 0,
          sufijo: ' %',
          texto: 'menos horas operativas para tu equipo',
        },
      ],
      cita: {
        texto:
          'Por primera vez el marketing dejó de ser una apuesta. Cada lunes sabemos qué funcionó, por qué y qué viene.',
        autor: 'Nombre Apellido',
        cargo: 'Dirección de Crecimiento · Empresa de ejemplo',
      },
      nota: 'Cifras ilustrativas de contenido de demostración.',
    },
    pie: {
      titulo: [['Hablemos de tu'], ['próximo ', { oro: 'trimestre.' }]],
      lead: 'Una llamada de 30 minutos para revisar tus canales y decirte, con números, dónde Aurum puede mover la aguja.',
      cta: 'Agenda una demo',
      correo: 'hola@aurum.example',
      columnas: [
        { titulo: 'Producto', enlaces: ['Servicios', 'Método', 'Resultados'] },
        { titulo: 'Empresa', enlaces: ['Nosotros', 'Carreras', 'Prensa'] },
        { titulo: 'Legal', enlaces: ['Privacidad', 'Términos', 'Cookies'] },
      ],
      derechos: '© 2026 Aurum. Contenido de demostración.',
      demo: 'Sitio de demostración',
    },
  },
  en: {
    meta: {
      titulo: 'Aurum — Marketing agent',
      descripcion:
        'Aurum is a marketing agent that plans, creates and optimizes your campaigns every day.',
    },
    ui: {
      saltar: 'Skip to content',
      grupoIdioma: 'Language',
      pausar: 'Pause background motion',
      reanudar: 'Resume background motion',
      progreso: 'Page sections',
      inicio: 'Aurum, home',
      navegacion: 'Main',
    },
    nav: {
      servicios: 'Services',
      metodo: 'Method',
      resultados: 'Results',
      demo: 'Book a demo',
    },
    hero: {
      etiqueta: 'Marketing agent',
      titulo: [
        ['Marketing that works'],
        ['with the ', { oro: 'precision' }, ' of metal.'],
      ],
      lead: 'Aurum plans, creates and optimizes your campaigns every day. One agent connected to your data, with the judgment of a senior team and the consistency of a machine.',
      cta: 'Book a demo',
      ctaSecundario: 'See how it works',
      datos: [
        { valor: '24/7', texto: 'Always-on operation' },
        { valor: '12', texto: 'Connected channels' },
        { valor: '14 days', texto: 'From signature to first report' },
      ],
      desliza: 'Scroll',
    },
    servicios: {
      etiqueta: '01 — Services',
      titulo: [['One agent.'], ['Your whole ', { oro: 'funnel.' }]],
      lead: 'Four fronts usually split between three agencies and an in-house team. Aurum runs them under one strategy and one report.',
      items: [
        {
          titulo: 'Strategy & planning',
          texto:
            'Studies your market and competitors, defines audiences and builds a media plan with goals you can measure.',
          canales: 'Research · Audiences · Media plan',
        },
        {
          titulo: 'Content & creative',
          texto:
            'Writes, adapts and tests assets for every channel without losing your brand voice.',
          canales: 'Copy · Assets · A/B tests',
        },
        {
          titulo: 'Campaigns & paid media',
          texto:
            'Launches, allocates budget and adjusts bids in real time based on what actually converts.',
          canales: 'Meta · Google · LinkedIn',
        },
        {
          titulo: 'Analytics & reporting',
          texto:
            'Turns data into decisions: one clear report every Monday, no spreadsheets, no jargon.',
          canales: 'Attribution · Dashboards · Weekly report',
        },
      ],
    },
    metodo: {
      etiqueta: '02 — Method',
      titulo: [['Three steps.'], [{ oro: 'Zero' }, ' guesswork.']],
      lead: 'Before moving a single dollar of budget, Aurum learns your business. Then it operates every day and reports every week.',
      pasos: [
        {
          titulo: 'Connect',
          texto:
            'We plug in your ad accounts, CRM and analytics. No migrations, no changes to your team.',
          plazo: 'Day 1–3',
        },
        {
          titulo: 'Calibrate',
          texto:
            'The agent learns your brand, margins and goals, then proposes a plan you approve.',
          plazo: 'Day 4–14',
        },
        {
          titulo: 'Scale',
          texto:
            'It runs daily, reports weekly and shifts budget toward what works.',
          plazo: 'From day 15',
        },
      ],
    },
    resultados: {
      etiqueta: '03 — Results',
      titulo: [['Numbers that'], [{ oro: 'hold up.' }]],
      lead: 'We track what your finance team tracks. No vanity metrics.',
      cifras: [
        {
          valor: 38,
          decimales: 0,
          sufijo: '%',
          texto: 'higher return on ad spend',
        },
        {
          valor: 3.2,
          decimales: 1,
          sufijo: '×',
          texto: 'more assets tested every month',
        },
        {
          valor: 61,
          decimales: 0,
          sufijo: '%',
          texto: 'fewer operational hours for your team',
        },
      ],
      cita: {
        texto:
          'For the first time, marketing stopped being a bet. Every Monday we know what worked, why, and what comes next.',
        autor: 'First Last',
        cargo: 'Head of Growth · Sample Company',
      },
      nota: 'Illustrative figures for demo content.',
    },
    pie: {
      titulo: [["Let's talk about"], ['your next ', { oro: 'quarter.' }]],
      lead: 'A 30-minute call to review your channels and show you, with numbers, where Aurum can move the needle.',
      cta: 'Book a demo',
      correo: 'hello@aurum.example',
      columnas: [
        { titulo: 'Product', enlaces: ['Services', 'Method', 'Results'] },
        { titulo: 'Company', enlaces: ['About', 'Careers', 'Press'] },
        { titulo: 'Legal', enlaces: ['Privacy', 'Terms', 'Cookies'] },
      ],
      derechos: '© 2026 Aurum. Demo content.',
      demo: 'Demo site',
    },
  },
};
