import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MODELS, ParallaxDirective, RevealDirective } from '@velox-ui-shared';

/** Segmento Models (`/models`) — la colección: encabezado + 3 tarjetas. */
@Component({
  selector: 'app-models-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, ParallaxDirective, RouterLink],
  templateUrl: './models.html',
})
export class ModelsPage {
  protected readonly models = MODELS;
}
