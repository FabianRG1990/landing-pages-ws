import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SiteNavComponent } from './site-nav.component';

describe('SiteNavComponent', () => {
  it('creates', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(SiteNavComponent);
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
