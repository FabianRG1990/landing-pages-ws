import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CONTACT, FOOTER_COLUMNS } from '../../data/nav';

/** Pie de página compartido — marca, horario, redes, columnas y newsletter. */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  protected readonly contact = CONTACT;
  protected readonly columns = FOOTER_COLUMNS;
}
