import { ChangeDetectionStrategy, Component } from '@angular/core';

/** La landing. Las secciones llegan en los commits siguientes. */
@Component({
  selector: 'app-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main id="contenido"></main>`,
})
export class Inicio {}
