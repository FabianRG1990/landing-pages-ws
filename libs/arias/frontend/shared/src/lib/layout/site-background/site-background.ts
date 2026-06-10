import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Fondo decorativo en capas (gradientes, grano, anillos y la marca tenue). */
@Component({
  selector: 'app-site-background',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-layers" aria-hidden="true">
      <div class="bg-base"></div>
      <div class="bg-grain"></div>
      <div class="bg-ring r1"></div>
      <div class="bg-ring r2"></div>
      <img class="bg-mono" src="assets/logo-mark.png" alt="" />
    </div>
  `,
})
export class SiteBackground {}
