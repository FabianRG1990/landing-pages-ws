import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FEATURES, RevealDirective } from '@velox-ui-shared';

/** Segmento Technology (`/technology`) — encabezado + grid de capacidades. */
@Component({
  selector: 'app-technology-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './technology.html',
})
export class TechnologyPage {
  protected readonly features = FEATURES;
}
