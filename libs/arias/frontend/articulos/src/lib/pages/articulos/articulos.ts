import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '@arias-ui-shared';

/** 05 · Artículos — espacio editorial (en construcción). */
@Component({
  selector: 'app-articulos-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective],
  templateUrl: './articulos.html',
})
export class ArticulosPage {}
