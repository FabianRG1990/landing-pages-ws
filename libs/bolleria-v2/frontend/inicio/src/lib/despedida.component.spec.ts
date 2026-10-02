import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DespedidaComponent } from './despedida.component';

describe('DespedidaComponent', () => {
  it('creates', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(DespedidaComponent);
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
