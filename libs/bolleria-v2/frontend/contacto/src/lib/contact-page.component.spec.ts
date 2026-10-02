import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContactPageComponent } from './contact-page.component';

describe('ContactPageComponent', () => {
  it('creates', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(ContactPageComponent);
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
