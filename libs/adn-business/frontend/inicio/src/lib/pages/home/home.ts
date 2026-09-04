import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavComponent } from '@adn-business-ui-shared/layout/nav/nav';
import { CountUpDirective } from '@adn-business-ui-shared/motion/count-up.directive';
import { RedHexComponent } from '@adn-business-ui-shared/webgl/red-hex';
import { DIAGNOSTICO, HERO, SITE } from '@adn-business-ui-shared/data/site';
import { SmoothScroll } from '@adn-business-ui-shared/smooth-scroll/smooth-scroll.service';
import { EjesComponent } from '../ejes/ejes';
import { MarcaComponent } from '../marca/marca';
import { ProgramasComponent } from '../programas/programas';
import { ContactoComponent } from '../contacto/contacto';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NavComponent, CountUpDirective, RedHexComponent, EjesComponent, MarcaComponent, ProgramasComponent, ContactoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  private readonly smooth = inject(SmoothScroll);

  protected readonly site = SITE;
  protected readonly hero = HERO;
  protected readonly diag = DIAGNOSTICO;

  constructor() {
    this.smooth.init();
  }
}
