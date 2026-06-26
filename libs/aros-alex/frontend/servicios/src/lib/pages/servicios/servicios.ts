import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  COPY,
  Icon,
  LanguageStore,
  RevealDirective,
  SERVICES,
  WHEELS,
  WHEEL_FILTERS,
} from '@aros-alex-ui-shared';

/** 02 · Servicios — las cuatro disciplinas y el catálogo Orbital a la venta. */
@Component({
  selector: 'app-servicios-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, Icon],
  templateUrl: './servicios.html',
})
export class ServiciosPage {
  protected readonly L = inject(LanguageStore);
  protected readonly copy = COPY;
  protected readonly services = SERVICES;
  protected readonly filters = WHEEL_FILTERS;

  protected readonly active = signal('todos');
  protected readonly wheels = computed(() => {
    const f = this.active();
    return f === 'todos' ? WHEELS : WHEELS.filter((w) => w.size === f);
  });
}
