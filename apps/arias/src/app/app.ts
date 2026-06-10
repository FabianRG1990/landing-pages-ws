import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  FloatingNav,
  Preloader,
  SiteBackground,
  TweaksPanel,
  Veil,
} from '@arias-ui-shared';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    SiteBackground,
    FloatingNav,
    Veil,
    Preloader,
    TweaksPanel,
  ],
  templateUrl: './app.html',
})
export class App {}
