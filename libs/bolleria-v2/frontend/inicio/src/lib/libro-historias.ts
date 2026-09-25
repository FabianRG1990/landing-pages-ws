/**
 * Las ocho paginas del libro: las siete historias con su foto y la de cierre.
 *
 * COPIA DELIBERADA de `STORIES` en `about-book.component.ts`. El libro nuevo no
 * importa aquella constante ni la comparte, porque compartirla obligaria a
 * editar el componente del libro actual, y ese archivo no se toca: es el que
 * sigue sirviendo al telefono en vertical y la condicion del encargo es que no
 * cambie ni un pixel.
 *
 * Es deuda consciente y conocida: si cambia un texto o una foto, hay que
 * cambiarlo en los dos sitios. Cuando el libro nuevo sea el unico, este archivo
 * pasa a ser la unica fuente y el otro se borra.
 */
export interface HistoriaLibro {
  /** Ruta de la foto, en la pagina izquierda. */
  readonly photo: string | null;
  /** Renglones del texto, en la pagina derecha. Cada uno salta de linea. */
  readonly lines: readonly string[];
}

const NBSP = ' ';
export const HISTORIAS: readonly HistoriaLibro[] = [
  {
    photo: 'assets/historia-1.webp',
    lines: ['Esta es nuestra historia: la de una panadería nacida de dos pasiones y de una convicción, que el buen pan merece tiempo.'],
  },
  {
    photo: 'assets/historia-2.webp',
    lines: ['La disciplina del deporte y la tradición de una familia panadera. De ahí vienen la constancia y el oficio de cada hogaza.'],
  },
  {
    photo: 'assets/historia-3.webp',
    lines: ['Marzo de 2023. Una esquina en Grecia y un sueño de pareja que empezó a tomar forma, pan a pan.'],
  },
  {
    photo: 'assets/historia-4.webp',
    lines: ['Desde el inicio quisimos algo diferente: pan artesanal de masa madre, con fermentación natural y sin atajos.'],
  },
  {
    photo: 'assets/historia-5.webp',
    lines: ['Horneamos todos los días, para que cada pieza llegue a su mesa con la frescura y el aroma del obrador.'],
  },
  {
    photo: 'assets/historia-6.webp',
    lines: ['Nueva casa, nueva imagen, el mismo pan. Crecimos sin cambiar lo esencial: la receta, las manos y el cuidado.'],
  },
  {
    photo: 'assets/historia-7.webp',
    lines: ['«Agradecida de estar cansada por construir la vida que un día soñamos.» Cada jornada larga vale la pena.'],
  },
  {
    photo: 'assets/historia-8.webp',
    lines: ['Todos los días', `100${NBSP}m este del Palí, Grecia`, `Express${NBSP}6040-9549`],
  },
];
