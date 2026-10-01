import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CurtainComponent } from './curtain.component';

describe('CurtainComponent', () => {
  it('creates', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(CurtainComponent);
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
