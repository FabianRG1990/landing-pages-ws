import {
  ESTADOS,
  acercar,
  avanceDeEntrada,
  estadoEn,
  focoDeBloque,
  posicionDeLectura,
} from './escena';

describe('estadoEn', () => {
  it('devuelve el estado exacto en el centro de cada sección', () => {
    ESTADOS.forEach((e, i) => expect(estadoEn(i)).toEqual(e));
  });

  it('interpola sin salirse del rango entre dos secciones', () => {
    const medio = estadoEn(0.5);
    const [a, b] = [ESTADOS[0], ESTADOS[1]];
    expect(medio.energia).toBeGreaterThanOrEqual(
      Math.min(a.energia, b.energia),
    );
    expect(medio.energia).toBeLessThanOrEqual(Math.max(a.energia, b.energia));
  });

  it('es continuo: un paso mínimo de scroll no produce un salto', () => {
    for (let p = 0; p < ESTADOS.length - 1; p += 0.01) {
      const d = Math.abs(estadoEn(p + 0.001).angulo - estadoEn(p).angulo);
      expect(d).toBeLessThan(0.01);
    }
  });

  it('se queda en los extremos fuera de rango', () => {
    expect(estadoEn(-3)).toEqual(ESTADOS[0]);
    expect(estadoEn(99)).toEqual(ESTADOS[ESTADOS.length - 1]);
  });
});

describe('posicionDeLectura', () => {
  const alto = 1000;
  const secciones = (scroll: number) =>
    [0, 1, 2].map((i) => ({ top: i * 1000 - scroll, height: 1000 }));

  it('vale el índice de la sección cuando su centro está en el centro de la pantalla', () => {
    expect(posicionDeLectura(secciones(0), alto)).toBe(0);
    expect(posicionDeLectura(secciones(1000), alto)).toBe(1);
    expect(posicionDeLectura(secciones(2000), alto)).toBe(2);
  });

  it('avanza en proporción al scroll entre dos centros', () => {
    expect(posicionDeLectura(secciones(500), alto)).toBeCloseTo(0.5);
  });

  it('sin secciones devuelve 0', () => {
    expect(posicionDeLectura([], alto)).toBe(0);
  });
});

describe('focoDeBloque', () => {
  const alto = 1000;

  it('es 1 con el bloque dentro de la franja de lectura', () => {
    expect(focoDeBloque(300, 600, alto)).toBe(1);
  });

  it('es 0 con el bloque fuera de pantalla', () => {
    expect(focoDeBloque(1200, 1500, alto)).toBe(0);
    expect(focoDeBloque(-600, -100, alto)).toBe(0);
  });

  it('mantiene en 1 un bloque más alto que la franja mientras la llena', () => {
    expect(focoDeBloque(-500, 2000, alto)).toBe(1);
  });
});

describe('avanceDeEntrada', () => {
  it('va de 0 al 88 % de la pantalla a 1 al 58 %', () => {
    expect(avanceDeEntrada(880, 1000)).toBe(0);
    expect(avanceDeEntrada(580, 1000)).toBe(1);
    expect(avanceDeEntrada(730, 1000)).toBeCloseTo(0.5);
  });
});

describe('acercar', () => {
  it('recorre la mitad del camino en una vida media, a cualquier tasa de fotogramas', () => {
    expect(acercar(0, 1, 100, 100)).toBeCloseTo(0.5);
    let v = 0;
    for (let i = 0; i < 12; i++) v = acercar(v, 1, 100 / 12, 100);
    expect(v).toBeCloseTo(0.5);
  });
});
