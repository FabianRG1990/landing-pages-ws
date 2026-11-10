import { TEXTOS, Textos } from './textos';

/** La forma de un valor: claves de objetos, largo de listas y tipos. */
function forma(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(forma);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, forma((v as Record<string, unknown>)[k])]),
    );
  }
  return typeof v;
}

const IDIOMAS = Object.values(TEXTOS) as Textos[];

describe('TEXTOS', () => {
  it('español e inglés tienen la misma estructura', () => {
    // Los titulares pueden partir distinto sus trozos; el resto no.
    const sinTitulares = (t: unknown) =>
      JSON.parse(
        JSON.stringify(t, (k, v) =>
          k === 'titulo' && Array.isArray(v) ? 'trozos' : v,
        ),
      );
    expect(forma(sinTitulares(TEXTOS.en))).toEqual(
      forma(sinTitulares(TEXTOS.es)),
    );
  });

  it('ningún texto queda vacío', () => {
    const vacios: string[] = [];
    const recorrer = (v: unknown, ruta: string) => {
      if (typeof v === 'string' && !v.trim()) vacios.push(ruta);
      else if (v && typeof v === 'object')
        Object.entries(v).forEach(([k, x]) => recorrer(x, `${ruta}.${k}`));
    };
    recorrer(TEXTOS, 'TEXTOS');
    expect(vacios).toEqual([]);
  });

  it('cada titular acentúa exactamente una palabra en oro', () => {
    for (const t of IDIOMAS) {
      for (const linea of [
        t.hero.titulo,
        t.recorrido.titulo,
        t.control.titulo,
        t.proyectos.titulo,
        t.pie.titulo,
      ]) {
        expect(linea.filter((trozo) => typeof trozo !== 'string')).toHaveLength(
          1,
        );
      }
    }
  });

  it('las listas casan con la interfaz que las pinta', () => {
    for (const t of IDIOMAS) {
      // Cinco etapas del recorrido, cada una con su pestaña y su estado.
      expect(t.recorrido.etapas).toHaveLength(5);
      expect(t.app.pestanas).toHaveLength(5);
      expect(t.app.estados).toHaveLength(5);
      // Los siete pasos del panel «Proceso» de la app real.
      expect(t.app.etapas).toHaveLength(7);
      // Seis nodos: las posiciones del grafo están fijas en pantalla.ts.
      expect(t.pantallas.canvas.nodos).toHaveLength(6);
      // Columnas del pie: sus destinos están fijos en pie.ts.
      expect(t.pie.columnas.map((c) => c.enlaces.length)).toEqual([3, 2]);
    }
  });
});
