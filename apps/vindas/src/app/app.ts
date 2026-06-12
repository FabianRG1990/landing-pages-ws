import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  Footer,
  FloatingNav,
  Preloader,
  SiteBackground,
  Veil,
} from '@vindas-ui-shared';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SiteBackground, FloatingNav, Veil, Preloader, Footer],
  templateUrl: './app.html',
})
export class App {}
