import { TestBed } from '@angular/core/testing';
import { Proceso } from './proceso';

/** Estado de los siete pasos del panel para una etapa del recorrido. */
function estados(etapa: number): string[] {
  const f = TestBed.createComponent(Proceso);
  f.componentRef.setInput('etapa', etapa);
  f.detectChanges();
  const pasos = Array.from(
    (f.nativeElement as HTMLElement).querySelectorAll('li'),
  );
  return pasos.map((li) =>
    li.classList.contains('hecho')
      ? 'h'
      : li.classList.contains('actual')
        ? 'a'
        : '-',
  );
}

describe('Proceso', () => {
  it('avanza con el recorrido, igual que el panel de la app', () => {
    expect(estados(0)).toEqual(['a', '-', '-', '-', '-', '-', '-']);
    // Especificación publicada: espera revisión.
    expect(estados(1)).toEqual(['h', 'h', 'h', 'a', '-', '-', '-']);
    expect(estados(2)).toEqual(['h', 'h', 'h', 'h', 'a', '-', '-']);
    expect(estados(3)).toEqual(['h', 'h', 'h', 'h', 'h', 'a', '-']);
    // Entregado: todo hecho, nada en curso.
    expect(estados(4)).toEqual(['h', 'h', 'h', 'h', 'h', 'h', 'h']);
  });
});
