import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CONTACT, MagneticDirective, RevealDirective } from '@interiorismo-ui-shared';

/** Contacto — invitación a comenzar y datos del estudio. */
@Component({
  selector: 'app-contacto-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, MagneticDirective],
  templateUrl: './contacto.html',
})
export class ContactoPage {
  protected readonly contact = CONTACT;
}
