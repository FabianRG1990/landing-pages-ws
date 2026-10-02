import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PreloaderComponent } from './preloader.component';

describe('PreloaderComponent', () => {
  it('creates', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(PreloaderComponent);
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
