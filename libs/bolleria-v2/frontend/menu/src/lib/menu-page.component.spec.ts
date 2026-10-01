import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MenuPageComponent } from './menu-page.component';

describe('MenuPageComponent', () => {
  it('creates', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(MenuPageComponent);
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
