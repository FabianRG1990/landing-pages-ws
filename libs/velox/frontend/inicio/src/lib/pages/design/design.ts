import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  DESIGN_DETAILS,
  ParallaxDirective,
  RevealDirective,
} from '@velox-ui-shared';

/** Segmento Design (`/design`) — split editorial: imagen + detalles. */
@Component({
  selector: 'app-design-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, ParallaxDirective],
  templateUrl: './design.html',
})
export class DesignPage {
  protected readonly designDetails = DESIGN_DETAILS;
}
