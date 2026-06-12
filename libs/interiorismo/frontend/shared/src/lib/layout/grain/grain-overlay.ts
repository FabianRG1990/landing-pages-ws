import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Capa de grano de película fija sobre toda la página (overlay sutil que da
 * textura analógica). Equivale al `<div class="grain-overlay">` original.
 */
@Component({
  selector: 'app-grain-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="grain-overlay" aria-hidden="true"></div>`,
})
export class GrainOverlay {}
