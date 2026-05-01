import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Footer } from './layout/footer/footer';
import { FloatingNav } from './layout/nav/floating-nav/floating-nav';
import { OceanBackground } from './layout/ocean-background/ocean-background';

/**
 * App — root layout. Equivalente al RootLayout de `app/layout.tsx` en el
 * proyecto Next: ocean-background fijo en z-0, nav fijo en z-50, main con
 * z-10 sobre el océano y footer al final.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, OceanBackground, FloatingNav, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
