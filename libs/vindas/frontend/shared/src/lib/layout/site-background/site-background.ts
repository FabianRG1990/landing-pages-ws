import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Fondo decorativo fijo: gradientes cálidos, marca tenue (×2) y grano. */
@Component({
  selector: 'app-site-background',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg" aria-hidden="true">
      <img class="bg__mark bg__mark--tr" src="assets/logo-mark.png" alt="" />
      <img class="bg__mark bg__mark--bl" src="assets/logo-mark.png" alt="" />
      <div class="bg__grain"></div>
    </div>
  `,
})
export class SiteBackground {}
