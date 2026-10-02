import { TestBed } from '@angular/core/testing';
import { PasarelaComponent } from './pasarela.component';

describe('PasarelaComponent', () => {
  it('pinta un tramo por cada paso, alternando el lado del sello', async () => {
    const fixture = TestBed.createComponent(PasarelaComponent);
    await fixture.whenStable();
    const tramos = fixture.nativeElement.querySelectorAll('.bol-pas__tramo');

    expect(tramos.length).toBe(3);
    expect(tramos[0].classList.contains('bol-pas__tramo--rev')).toBe(false);
    expect(tramos[1].classList.contains('bol-pas__tramo--rev')).toBe(true);
  });

  it('deja el título como texto real para quien no ve el lienzo', async () => {
    const fixture = TestBed.createComponent(PasarelaComponent);
    await fixture.whenStable();
    const titulos = [...fixture.nativeElement.querySelectorAll('h2.bol-pas__titulo')].map((h) => h.textContent.trim());

    expect(titulos).toEqual(['Masa madre', 'A mano', 'Al horno']);
  });
});
