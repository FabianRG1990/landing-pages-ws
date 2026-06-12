import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Nav, Footer, Preloader, SmoothScroll } from '@velox-ui-shared';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Nav, Footer, Preloader],
  templateUrl: './app.html',
})
export class App {
  private readonly smoothScroll = inject(SmoothScroll);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Lenis smooth scroll a nivel de página: maneja TODA la deceleración y
    // alimenta el ticker de GSAP/ScrollTrigger que usa el showcase cinemático.
    this.smoothScroll.init();
    this.destroyRef.onDestroy(() => this.smoothScroll.destroy());
  }
}
