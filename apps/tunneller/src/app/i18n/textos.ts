// Textos de la landing de Tunneller en español e inglés. Los dos
// diccionarios comparten el tipo Textos: si a uno le falta una clave, no
// compila. Las cifras de los proyectos salen de la demo grabada del
// producto; no hay ninguna inventada.

/** Un trozo de titular: texto plano o una palabra acentuada en oro. */
export type Trozo = string | { readonly oro: string };
export type Linea = readonly Trozo[];

export type CodigoIdioma = 'es' | 'en';

interface Etapa {
  readonly nombre: string;
  readonly titulo: string;
  readonly texto: string;
}

interface Pregunta {
  readonly pregunta: string;
  readonly opciones: readonly string[];
  readonly recomendacion: string;
}

interface Nodo {
  readonly numero: string;
  readonly tipo: string;
  readonly titulo: string;
}

interface Proyecto {
  readonly nombre: string;
  readonly repo: string;
  readonly texto: string;
  readonly datos: readonly string[];
}

export interface Textos {
  readonly meta: { readonly titulo: string; readonly descripcion: string };
  readonly ui: {
    readonly saltar: string;
    readonly grupoIdioma: string;
    readonly pausar: string;
    readonly reanudar: string;
    readonly navegacion: string;
    readonly inicio: string;
  };
  readonly nav: {
    readonly recorrido: string;
    readonly control: string;
    readonly proyectos: string;
    readonly demo: string;
  };
  readonly hero: {
    readonly etiqueta: string;
    readonly titulo: Linea;
    readonly lead: string;
    readonly cta: string;
    readonly ctaSecundario: string;
  };
  /** La interfaz de la app, tal como se ve en el producto. */
  readonly app: {
    readonly idea: string;
    readonly proceso: string;
    readonly etapas: readonly string[];
    readonly hecho: string;
    readonly enCurso: string;
    readonly pendiente: string;
    readonly pestanas: readonly string[];
    readonly estados: readonly string[];
  };
  readonly recorrido: {
    readonly etiqueta: string;
    readonly titulo: Linea;
    readonly lead: string;
    readonly etapas: readonly Etapa[];
  };
  readonly pantallas: {
    readonly destino: {
      readonly tu: string;
      readonly intro: string;
      readonly preguntas: readonly Pregunta[];
    };
    readonly especificacion: {
      readonly intro: string;
      readonly puntos: readonly string[];
      readonly decisiones: string;
      readonly revertir: string;
      readonly revision: string;
      readonly aprobar: string;
      readonly cambios: string;
      readonly detener: string;
    };
    readonly canvas: {
      readonly nodos: readonly Nodo[];
      readonly bloqueado: string;
    };
    readonly consola: {
      readonly lineas: readonly string[];
      readonly pruebas: string;
      readonly progreso: string;
    };
    readonly entrega: {
      readonly pr: string;
      readonly checks: string;
      readonly checksTexto: string;
      readonly vista: string;
      readonly conflictos: string;
      readonly ruleta: string;
      readonly opciones: readonly string[];
      readonly girar: string;
    };
  };
  readonly control: {
    readonly etiqueta: string;
    readonly titulo: Linea;
    readonly lead: string;
    readonly piloto: {
      readonly titulo: string;
      readonly texto: string;
      readonly etiqueta: string;
      readonly auto: string;
    };
    readonly aprobar: { readonly titulo: string; readonly texto: string };
    readonly revertir: {
      readonly titulo: string;
      readonly texto: string;
      readonly ejemplo: string;
      readonly accion: string;
    };
    readonly github: {
      readonly titulo: string;
      readonly texto: string;
      readonly items: readonly string[];
    };
  };
  readonly proyectos: {
    readonly etiqueta: string;
    readonly titulo: Linea;
    readonly lead: string;
    readonly items: readonly Proyecto[];
    readonly nota: string;
  };
  readonly pie: {
    readonly titulo: Linea;
    readonly lead: string;
    readonly cta: string;
    readonly correo: string;
    readonly columnas: readonly {
      readonly titulo: string;
      readonly enlaces: readonly string[];
    }[];
    readonly derechos: string;
  };
}

const ES: Textos = {
  meta: {
    titulo: 'Tunneller — De una idea a una app que funciona',
    descripcion:
      'Tunneller es un agente de IA que convierte una idea en una app publicada: pregunta, especifica, planifica y construye con pruebas, y tú apruebas cada paso.',
  },
  ui: {
    saltar: 'Saltar al contenido',
    grupoIdioma: 'Idioma',
    pausar: 'Pausar el movimiento',
    reanudar: 'Reanudar el movimiento',
    navegacion: 'Principal',
    inicio: 'Tunneller, inicio',
  },
  nav: {
    recorrido: 'Cómo trabaja',
    control: 'Control',
    proyectos: 'Proyectos',
    demo: 'Agenda una demo',
  },
  hero: {
    etiqueta: 'Agente de software con IA',
    titulo: ['De una idea a una app que ', { oro: 'funciona.' }],
    lead: 'Cuéntale tu idea. Tunneller pregunta, especifica, planifica y la construye con pruebas. Tú apruebas cada paso y recibes una app publicada.',
    cta: 'Agenda una demo',
    ctaSecundario: 'Ver cómo trabaja',
  },
  app: {
    idea: 'Quiero una app sencilla tipo ruleta para tomar decisiones: escribo algunas opciones y la giro.',
    proceso: 'Proceso',
    etapas: [
      'Destino',
      'Decisiones',
      'Especificación',
      'Revisión',
      'Planificación',
      'Implementación',
      'Proyecto terminado',
    ],
    hecho: 'Hecho',
    enCurso: 'En curso',
    pendiente: 'Pendiente',
    pestanas: ['Chat', 'Chat', 'Canvas', 'Consola', 'Pull request'],
    estados: [
      'Esperando input',
      'Esperando revisión',
      'Planificando',
      'Implementando',
      'Terminada',
    ],
  },
  recorrido: {
    etiqueta: '01 — Cómo trabaja',
    titulo: ['Cinco etapas. ', { oro: 'Ninguna' }, ' caja negra.'],
    lead: 'Tunneller no salta al código. Primero entiende, luego escribe lo que va a hacer, lo divide en tareas y lo construye con pruebas. Ves cada paso y decides cuándo avanzar.',
    etapas: [
      {
        nombre: 'Destino',
        titulo: 'Primero entiende qué quieres',
        texto:
          'Hace las preguntas que haría un equipo senior antes de empezar, cada una con su recomendación. Respondes en minutos, no en reuniones.',
      },
      {
        nombre: 'Especificación',
        titulo: 'Lo escribe antes de construirlo',
        texto:
          'Publica la especificación como un issue en tu GitHub: historias de usuario, cómo se prueba y qué decidió solo, con la forma de revertirlo.',
      },
      {
        nombre: 'Planificación',
        titulo: 'Divide el trabajo en tareas',
        texto:
          'Un mapa de tareas conectadas: qué va primero, qué bloquea a qué y qué puede avanzar en paralelo.',
      },
      {
        nombre: 'Implementación',
        titulo: 'Construye con pruebas',
        texto:
          'Escribe la prueba y luego el código. Valida en un navegador real y deja cada paso registrado en la consola.',
      },
      {
        nombre: 'Entrega',
        titulo: 'Te entrega una app funcionando',
        texto:
          'Un pull request con los checks en verde y una vista previa publicada, para que la pruebes antes de fusionar.',
      },
    ],
  },
  pantallas: {
    destino: {
      tu: 'Tú',
      intro:
        'Buena idea. Antes de construir quiero dejar claro qué vamos a hacer. Primera ronda:',
      preguntas: [
        {
          pregunta: '¿Dónde se usa?',
          opciones: [
            'Una web en el navegador',
            'Una app nativa de móvil',
            'Una app de escritorio',
          ],
          recomendacion:
            'Una web que funcione bien en el móvil: lo más sencillo de construir y de compartir.',
        },
        {
          pregunta: '¿Guarda las opciones?',
          opciones: [
            'Se pierden al cerrar',
            'Recuerda la última lista',
            'Varias ruletas con nombre',
          ],
          recomendacion:
            'Recordar la última lista en el dispositivo, sin cuentas ni servidor.',
        },
      ],
    },
    especificacion: {
      intro: 'He publicado la Especificación de la Ruleta en el issue #2.',
      puntos: [
        '38 historias de usuario: añadir, borrar y vaciar opciones, el giro animado y el resultado.',
        'Las reglas se prueban en un solo módulo, sin dependencias.',
        'Accesible y publicada en GitHub Pages.',
      ],
      decisiones:
        'Decisión tomada sin consultar: la lista se guarda en el dispositivo.',
      revertir: 'Revertir: editar «Implementation Decisions» en #2.',
      revision: 'Revisión de la Especificación #2',
      aprobar: 'Aprobar',
      cambios: 'Pedir cambios',
      detener: 'Detener',
    },
    canvas: {
      nodos: [
        {
          numero: '#1',
          tipo: 'Proyecto',
          titulo: 'Ruleta para tomar decisiones',
        },
        {
          numero: '#2',
          tipo: 'Especificación',
          titulo: 'Especificación de la Ruleta',
        },
        { numero: '#3', tipo: 'Tarea', titulo: 'Lista de opciones editable' },
        { numero: '#4', tipo: 'Tarea', titulo: 'Recordar la lista' },
        { numero: '#5', tipo: 'Tarea', titulo: 'Rueda dibujada' },
        { numero: '#6', tipo: 'Tarea', titulo: 'Girar y mostrar el resultado' },
      ],
      bloqueado: 'Bloqueado',
    },
    consola: {
      lineas: [
        'Primero la prueba de colores: roja.',
        'Verde. Ahora HTML, interfaz y estilos.',
        'Valido en un navegador sin cabeza a 390 y 1280 px.',
        'La rueda gira y se detiene en el resultado. Hago el commit.',
      ],
      pruebas: 'node --test · 18 de 18 pruebas',
      progreso: 'Implementación',
    },
    entrega: {
      pr: 'Ruleta para tomar decisiones',
      checks: 'Todos los checks pasaron',
      checksTexto: 'Pruebas y compilación correctas',
      vista: 'Vista previa publicada',
      conflictos: 'Sin conflictos con la rama base',
      ruleta: 'Ruleta',
      opciones: ['Comer', 'Cocinar', 'Pedir'],
      girar: 'Girar',
    },
  },
  control: {
    etiqueta: '02 — Control',
    titulo: ['Automático cuando quieras. ', { oro: 'Tuyo' }, ' siempre.'],
    lead: 'Tunneller avanza solo hasta donde le dejes. Cada decisión queda escrita, cada cambio pasa por tu GitHub y nada se fusiona sin ti.',
    piloto: {
      titulo: 'Piloto automático',
      texto:
        'Deja que avance de una etapa a la siguiente, o que se detenga a esperar tu visto bueno en cada una.',
      etiqueta: 'Piloto automático',
      auto: 'Auto-aprobaciones',
    },
    aprobar: {
      titulo: 'Tú apruebas',
      texto:
        'Antes de planificar y de construir te muestra lo que va a hacer. Apruebas, pides cambios o lo detienes.',
    },
    revertir: {
      titulo: 'Cada decisión, reversible',
      texto:
        'Lo que decide sin consultarte queda anotado junto con la forma exacta de deshacerlo.',
      ejemplo: 'Las pruebas cubren el módulo de reglas.',
      accion: 'Revertir: editar «Testing Decisions» en #2.',
    },
    github: {
      titulo: 'Vive en tu GitHub',
      texto:
        'Nada queda en una caja cerrada: el trabajo son issues, pull requests y checks en tus repositorios.',
      items: [
        'Issue #2 · Especificación',
        'Pull request #7 · checks en verde',
        'Vista previa publicada',
      ],
    },
  },
  proyectos: {
    etiqueta: '03 — Proyectos',
    titulo: ['No es una promesa. ', { oro: 'Ya' }, ' está construido.'],
    lead: 'Apps reales que Tunneller llevó de una frase a una vista previa funcionando, con sus issues, sus pruebas y su pull request.',
    items: [
      {
        nombre: 'Ruleta para decidir',
        repo: 'Tunneller-Demo/Ruleta',
        texto:
          'Escribes las opciones, giras y la rueda elige. Recuerda la lista en el móvil.',
        datos: ['38 historias de usuario', '18 pruebas'],
      },
      {
        nombre: 'Ajedrez web',
        repo: 'Tunneller-Demo/ajedrez',
        texto:
          'Partidas entre dos personas o contra la máquina con niveles de dificultad.',
        datos: ['9 de 9 decisiones', '17 de 17 tareas'],
      },
      {
        nombre: 'Tablero kanban',
        repo: 'Tunneller-Demo/kanban',
        texto: 'Columnas y tarjetas para organizar el trabajo de un equipo.',
        datos: ['Repositorio público'],
      },
      {
        nombre: 'Contador de macros',
        repo: 'Tunneller-Demo/macros',
        texto:
          'Registro de comidas con proteínas, carbohidratos y grasas del día.',
        datos: ['Repositorio público'],
      },
    ],
    nota: 'Repositorios de demostración en GitHub, construidos con Tunneller.',
  },
  pie: {
    titulo: ['¿Qué quieres ', { oro: 'construir?' }],
    lead: 'Cuéntanos tu idea y te enseñamos a Tunneller llevándola de una frase a una app publicada.',
    cta: 'Agenda una demo',
    correo: 'hola@tunneller.app',
    columnas: [
      { titulo: 'Producto', enlaces: ['Cómo trabaja', 'Control', 'Proyectos'] },
      { titulo: 'Empresa', enlaces: ['Contacto', 'Agenda una demo'] },
    ],
    derechos: '© 2026 Tunneller. Todos los derechos reservados.',
  },
};

const EN: Textos = {
  meta: {
    titulo: 'Tunneller — From an idea to an app that works',
    descripcion:
      'Tunneller is an AI agent that turns an idea into a published app: it asks, specifies, plans and builds with tests, and you approve every step.',
  },
  ui: {
    saltar: 'Skip to content',
    grupoIdioma: 'Language',
    pausar: 'Pause motion',
    reanudar: 'Resume motion',
    navegacion: 'Main',
    inicio: 'Tunneller, home',
  },
  nav: {
    recorrido: 'How it works',
    control: 'Control',
    proyectos: 'Projects',
    demo: 'Book a demo',
  },
  hero: {
    etiqueta: 'AI software agent',
    titulo: ['From an idea to an app that ', { oro: 'works.' }],
    lead: 'Tell it your idea. Tunneller asks, specifies, plans and builds it with tests. You approve every step and get a published app.',
    cta: 'Book a demo',
    ctaSecundario: 'See how it works',
  },
  app: {
    idea: 'I want a simple roulette app to make decisions: I type a few options and spin it.',
    proceso: 'Process',
    etapas: [
      'Destination',
      'Decisions',
      'Specification',
      'Review',
      'Planning',
      'Implementation',
      'Project done',
    ],
    hecho: 'Done',
    enCurso: 'In progress',
    pendiente: 'Pending',
    pestanas: ['Chat', 'Chat', 'Canvas', 'Console', 'Pull request'],
    estados: [
      'Waiting for input',
      'Waiting for review',
      'Planning',
      'Implementing',
      'Finished',
    ],
  },
  recorrido: {
    etiqueta: '01 — How it works',
    titulo: ['Five stages. ', { oro: 'No' }, ' black box.'],
    lead: 'Tunneller doesn’t jump into code. It understands first, writes down what it will do, splits it into tasks and builds it with tests. You see every step and decide when to move on.',
    etapas: [
      {
        nombre: 'Destination',
        titulo: 'It understands what you want',
        texto:
          'It asks the questions a senior team would ask before starting, each with its recommendation. You answer in minutes, not meetings.',
      },
      {
        nombre: 'Specification',
        titulo: 'It writes it down before building',
        texto:
          'It publishes the specification as an issue on your GitHub: user stories, how it’s tested and what it decided on its own, with how to undo it.',
      },
      {
        nombre: 'Planning',
        titulo: 'It splits the work into tasks',
        texto:
          'A map of connected tasks: what comes first, what blocks what and what can move in parallel.',
      },
      {
        nombre: 'Implementation',
        titulo: 'It builds with tests',
        texto:
          'It writes the test, then the code. It checks the result in a real browser and logs every step in the console.',
      },
      {
        nombre: 'Delivery',
        titulo: 'It hands you a working app',
        texto:
          'A pull request with green checks and a published preview, so you can try it before merging.',
      },
    ],
  },
  pantallas: {
    destino: {
      tu: 'You',
      intro:
        'Good idea. Before building I want to be clear on what we’ll make. First round:',
      preguntas: [
        {
          pregunta: 'Where is it used?',
          opciones: [
            'A web app in the browser',
            'A native mobile app',
            'A desktop app',
          ],
          recomendacion:
            'A web app that works well on mobile: the simplest to build and to share.',
        },
        {
          pregunta: 'Does it keep the options?',
          opciones: [
            'Lost when closed',
            'Remembers the last list',
            'Several named roulettes',
          ],
          recomendacion:
            'Remember the last list on the device, with no accounts or server.',
        },
      ],
    },
    especificacion: {
      intro: 'I’ve published the Roulette Specification in issue #2.',
      puntos: [
        '38 user stories: add, delete and clear options, the animated spin and the result.',
        'The rules are tested in a single module, with no dependencies.',
        'Accessible and published on GitHub Pages.',
      ],
      decisiones:
        'Decision made without asking: the list is stored on the device.',
      revertir: 'Revert: edit “Implementation Decisions” in #2.',
      revision: 'Review of Specification #2',
      aprobar: 'Approve',
      cambios: 'Request changes',
      detener: 'Stop',
    },
    canvas: {
      nodos: [
        { numero: '#1', tipo: 'Project', titulo: 'Roulette to make decisions' },
        {
          numero: '#2',
          tipo: 'Specification',
          titulo: 'Roulette specification',
        },
        { numero: '#3', tipo: 'Task', titulo: 'Editable list of options' },
        { numero: '#4', tipo: 'Task', titulo: 'Remember the list' },
        { numero: '#5', tipo: 'Task', titulo: 'Drawn wheel' },
        { numero: '#6', tipo: 'Task', titulo: 'Spin and show the result' },
      ],
      bloqueado: 'Blocked',
    },
    consola: {
      lineas: [
        'First the colour test: red.',
        'Green. Now HTML, interface and styles.',
        'Checking in a headless browser at 390 and 1280 px.',
        'The wheel spins and stops on the result. Committing.',
      ],
      pruebas: 'node --test · 18 of 18 tests',
      progreso: 'Implementation',
    },
    entrega: {
      pr: 'Roulette to make decisions',
      checks: 'All checks have passed',
      checksTexto: 'Tests and build succeeded',
      vista: 'Preview published',
      conflictos: 'No conflicts with the base branch',
      ruleta: 'Roulette',
      opciones: ['Eat out', 'Cook', 'Order in'],
      girar: 'Spin',
    },
  },
  control: {
    etiqueta: '02 — Control',
    titulo: ['Automatic when you want. ', { oro: 'Yours' }, ' always.'],
    lead: 'Tunneller moves on its own only as far as you let it. Every decision is written down, every change goes through your GitHub and nothing is merged without you.',
    piloto: {
      titulo: 'Autopilot',
      texto:
        'Let it move from one stage to the next, or have it stop and wait for your go-ahead at each one.',
      etiqueta: 'Autopilot',
      auto: 'Auto-approvals',
    },
    aprobar: {
      titulo: 'You approve',
      texto:
        'Before planning and before building it shows you what it will do. You approve, request changes or stop it.',
    },
    revertir: {
      titulo: 'Every decision, reversible',
      texto:
        'Whatever it decides without asking is written down along with the exact way to undo it.',
      ejemplo: 'Tests cover the rules module.',
      accion: 'Revert: edit “Testing Decisions” in #2.',
    },
    github: {
      titulo: 'It lives on your GitHub',
      texto:
        'Nothing stays in a closed box: the work is issues, pull requests and checks in your repositories.',
      items: [
        'Issue #2 · Specification',
        'Pull request #7 · green checks',
        'Preview published',
      ],
    },
  },
  proyectos: {
    etiqueta: '03 — Projects',
    titulo: ['Not a promise. ', { oro: 'Already' }, ' built.'],
    lead: 'Real apps Tunneller took from one sentence to a working preview, with their issues, their tests and their pull request.',
    items: [
      {
        nombre: 'Decision roulette',
        repo: 'Tunneller-Demo/Ruleta',
        texto:
          'Type the options, spin, and the wheel picks. It remembers the list on your phone.',
        datos: ['38 user stories', '18 tests'],
      },
      {
        nombre: 'Web chess',
        repo: 'Tunneller-Demo/ajedrez',
        texto:
          'Games between two people or against the computer with difficulty levels.',
        datos: ['9 of 9 decisions', '17 of 17 tasks'],
      },
      {
        nombre: 'Kanban board',
        repo: 'Tunneller-Demo/kanban',
        texto: 'Columns and cards to organise a team’s work.',
        datos: ['Public repository'],
      },
      {
        nombre: 'Macro tracker',
        repo: 'Tunneller-Demo/macros',
        texto: 'A food log with the day’s protein, carbs and fat.',
        datos: ['Public repository'],
      },
    ],
    nota: 'Demo repositories on GitHub, built with Tunneller.',
  },
  pie: {
    titulo: ['What do you want to ', { oro: 'build?' }],
    lead: 'Tell us your idea and we’ll show you Tunneller taking it from one sentence to a published app.',
    cta: 'Book a demo',
    correo: 'hola@tunneller.app',
    columnas: [
      { titulo: 'Product', enlaces: ['How it works', 'Control', 'Projects'] },
      { titulo: 'Company', enlaces: ['Contact', 'Book a demo'] },
    ],
    derechos: '© 2026 Tunneller. All rights reserved.',
  },
};

export const TEXTOS: Readonly<Record<CodigoIdioma, Textos>> = {
  es: ES,
  en: EN,
};
