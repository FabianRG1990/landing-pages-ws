import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FloatingNav, Footer, GrainOverlay, Preloader, Veil } from '@interiorismo-ui-shared';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, GrainOverlay, FloatingNav, Veil, Preloader, Footer],
  templateUrl: './app.html',
})
export class App {}
