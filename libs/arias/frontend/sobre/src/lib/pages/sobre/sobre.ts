import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '@arias-ui-shared';

/** 02 · Sobre la Dra. — perfil, formación y credenciales. */
@Component({
  selector: 'app-sobre-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective],
  templateUrl: './sobre.html',
})
export class SobrePage {}
