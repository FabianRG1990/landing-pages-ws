import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<main id="contenido"></main>',
})
export class Inicio {}
