// Funciones puras de la coreografía: no tocan el DOM y se prueban solas.

/** El carácter del metal en cada sección. */
export interface EstadoMetal {
  /** Dirección de la luz del estudio, en radianes. */
  angulo: number;
  /** Cuánto oro reflejan las franjas cálidas (0..1). */
  acento: number;
  /** Contraste del metal frente al fondo mate (0..1). */
  energia: number;
  /** Cuánta superficie cubre el metal (−0,4 escaso … 0,6 casi todo). */
  cobertura: number;
  /** Velocidad del líquido, multiplicador del reloj. */
  velocidad: number;
}

// Hero, Servicios, Método, Resultados, Pie. Cada uno cambia la luz y la
// cantidad de oro, nunca la técnica: el mismo material visto de otra forma.
export const ESTADOS: readonly EstadoMetal[] = [
  { angulo: 0.62, acento: 0.6, energia: 0.92, cobertura: 0.34, velocidad: 1 },
  { angulo: 2.25, acento: 0.5, energia: 0.6, cobertura: 0.0, velocidad: 0.8 },
  {
    angulo: -0.55,
    acento: 0.78,
    energia: 0.84,
    cobertura: 0.1,
    velocidad: 0.9,
  },
  {
    angulo: 1.25,
    acento: 0.58,
    energia: 0.56,
    cobertura: -0.04,
    velocidad: 0.72,
  },
  {
    angulo: 0.18,
    acento: 0.85,
    energia: 0.86,
    cobertura: 0.26,
    velocidad: 0.6,
  },
];

export const clamp = (v: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, v));

export const suavizar = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

// Exacta en los extremos (t = 0 da a, t = 1 da b), sin error de redondeo.
const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;

/**
 * Estado continuo para una posición fraccionaria en la página: 0 es el
 * centro del hero, 1 el de Servicios, etc. Sin escalones: la luz gira a
 * medida que se hace scroll.
 */
export function estadoEn(
  posicion: number,
  estados: readonly EstadoMetal[] = ESTADOS,
): EstadoMetal {
  const ultimo = estados.length - 1;
  const p = clamp(posicion, 0, ultimo);
  const i = Math.min(Math.floor(p), ultimo - 1);
  const t = suavizar(p - i);
  const a = estados[i];
  const b = estados[i + 1];
  return {
    angulo: lerp(a.angulo, b.angulo, t),
    acento: lerp(a.acento, b.acento, t),
    energia: lerp(a.energia, b.energia, t),
    cobertura: lerp(a.cobertura, b.cobertura, t),
    velocidad: lerp(a.velocidad, b.velocidad, t),
  };
}

/**
 * Posición fraccionaria a partir de los rectángulos de las secciones:
 * la sección cuyo cuerpo cruza el centro de la pantalla, más lo que ya
 * recorrió. Vale i exactamente cuando el centro de la sección i está en
 * el centro de la pantalla.
 */
export function posicionDeLectura(
  secciones: readonly { top: number; height: number }[],
  alto: number,
): number {
  if (!secciones.length) return 0;
  const centro = alto / 2;
  const centros = secciones.map((s) => s.top + s.height / 2);
  if (centro <= centros[0]) return 0;
  for (let i = 0; i < centros.length - 1; i++) {
    if (centro < centros[i + 1])
      return i + (centro - centros[i]) / (centros[i + 1] - centros[i]);
  }
  return centros.length - 1;
}

/**
 * Foco de un bloque: 1 mientras ocupa la franja de lectura (del 14 % al
 * 86 % de la pantalla), y baja de tono al salir de ella. Un bloque más alto
 * que la franja queda en 1 mientras la llene.
 */
export function focoDeBloque(
  top: number,
  bottom: number,
  alto: number,
): number {
  const arriba = alto * 0.14;
  const abajo = alto * 0.86;
  const cruce = Math.min(bottom, abajo) - Math.max(top, arriba);
  if (cruce <= 0) return 0;
  const referencia = Math.min(bottom - top, abajo - arriba);
  return suavizar((cruce / referencia - 0.3) / 0.5);
}

/**
 * Avance de un elemento que se enciende al subir: 0 cuando su borde
 * superior está al 88 % de la pantalla, 1 cuando llega al 58 %.
 */
export function avanceDeEntrada(top: number, alto: number): number {
  return clamp((alto * 0.88 - top) / (alto * 0.3));
}

/** Acercamiento exponencial independiente de los fps. */
export function acercar(
  actual: number,
  objetivo: number,
  dtMs: number,
  vidaMediaMs: number,
): number {
  const k = 1 - Math.pow(0.5, dtMs / vidaMediaMs);
  return actual + (objetivo - actual) * k;
}
