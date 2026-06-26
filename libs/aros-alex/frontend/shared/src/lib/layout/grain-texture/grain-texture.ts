import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Textura "carbon weave" fija sobre todo el sitio (overlay decorativo). */
@Component({
  selector: 'app-grain-texture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="grain" aria-hidden="true"></div>`,
})
export class GrainTexture {}
