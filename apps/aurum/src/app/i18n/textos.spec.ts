import { TEXTOS } from './textos';

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

describe('TEXTOS', () => {
  it('español e inglés tienen la misma estructura', () => {
    // Los titulares pueden partir distinto sus renglones; el resto no.
    const sinTitulares = (t: unknown) =>
      JSON.parse(
        JSON.stringify(t, (k, v) =>
          k === 'titulo' && Array.isArray(v) ? 'renglones' : v,
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
    const titulares = (
      Object.values(TEXTOS) as (typeof TEXTOS)['es'][]
    ).flatMap((t) => [
      t.hero.titulo,
      t.servicios.titulo,
      t.metodo.titulo,
      t.resultados.titulo,
      t.pie.titulo,
    ]);
    for (const lineas of titulares) {
      const oros = lineas.flat().filter((trozo) => typeof trozo !== 'string');
      expect(oros).toHaveLength(1);
    }
  });
});
