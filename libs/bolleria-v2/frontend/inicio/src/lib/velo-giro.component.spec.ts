import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { VeloGiroComponent } from './velo-giro.component';

describe('VeloGiroComponent', () => {
  it('creates', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(VeloGiroComponent);
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
