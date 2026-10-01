import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AboutBook2026Component } from './about-book-2026.component';

describe('AboutBook2026Component', () => {
  it('creates', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(AboutBook2026Component);
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
