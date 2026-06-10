import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '@arias-ui-shared';

/** 03 · Servicios — modalidades de terapia y áreas de consulta. */
@Component({
  selector: 'app-servicios-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective],
  templateUrl: './servicios.html',
})
export class ServiciosPage {}
