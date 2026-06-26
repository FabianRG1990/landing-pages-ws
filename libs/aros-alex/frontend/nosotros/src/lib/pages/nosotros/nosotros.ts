import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  CONTACT,
  COPY,
  Icon,
  LanguageStore,
  RevealDirective,
} from '@aros-alex-ui-shared';

/** 04 · Nosotros — trayectoria, taller y principios de Aros Alex. */
@Component({
  selector: 'app-nosotros-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, Icon],
  templateUrl: './nosotros.html',
})
export class NosotrosPage {
  protected readonly L = inject(LanguageStore);
  protected readonly copy = COPY.nosotros;
  protected readonly contact = CONTACT;
}
