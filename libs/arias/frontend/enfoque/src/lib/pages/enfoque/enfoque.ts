import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '@arias-ui-shared';

/** 04 · Enfoque — el abordaje terapéutico y sus pilares. */
@Component({
  selector: 'app-enfoque-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective],
  templateUrl: './enfoque.html',
})
export class EnfoquePage {}
