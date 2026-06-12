import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective, TESTIMONIAL } from '@velox-ui-shared';

/** Segmento Ownership (`/ownership`) — testimonio + reserva de test drive. */
@Component({
  selector: 'app-ownership-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './ownership.html',
})
export class OwnershipPage {
  protected readonly testimonial = TESTIMONIAL;
}
