import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  FloatingNav,
  GrainTexture,
  Preloader,
  SiteFooter,
  Veil,
} from '@aros-alex-ui-shared';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, GrainTexture, Preloader, Veil, FloatingNav, SiteFooter],
  templateUrl: './app.html',
})
export class App {}
