import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROGRAMAS, SERVICIOS, SITE } from '@adn-business-ui-shared/data/site';

@Component({
  selector: 'app-programas',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './programas.html',
  styleUrl: './programas.scss',
})
export class ProgramasComponent {
  protected readonly p = PROGRAMAS;
  protected readonly s = SERVICIOS;
  protected readonly site = SITE;
}
