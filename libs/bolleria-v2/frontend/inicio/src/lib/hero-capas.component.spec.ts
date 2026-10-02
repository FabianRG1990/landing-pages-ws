import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HeroCapasComponent } from './hero-capas.component';

describe('HeroCapasComponent', () => {
  it('creates', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(HeroCapasComponent);
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
