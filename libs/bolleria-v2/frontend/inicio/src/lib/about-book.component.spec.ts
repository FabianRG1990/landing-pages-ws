import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AboutBookComponent } from './about-book.component';

describe('AboutBookComponent', () => {
  it('creates', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(AboutBookComponent);
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
