import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CONTACT } from '../../data/nav';

/** Pie de página compartido — marca, contacto, estudio y redes. */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './footer.html',
})
export class Footer {
  protected readonly contact = CONTACT;
}
