import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  CONTACT,
  COPY,
  HOURS,
  Icon,
  LanguageStore,
  OpeningHours,
  RevealDirective,
} from '@aros-alex-ui-shared';

/** 05 · Contacto — formulario (mailto), accesos directos y horario en vivo. */
@Component({
  selector: 'app-contacto-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, Icon],
  templateUrl: './contacto.html',
})
export class ContactoPage {
  protected readonly L = inject(LanguageStore);
  protected readonly hoursService = inject(OpeningHours);
  protected readonly copy = COPY.contacto;
  protected readonly hoursCopy = COPY.hours;
  protected readonly contact = CONTACT;
  protected readonly hours = HOURS;

  protected readonly values = signal<Record<string, string>>({
    'f-name': '',
    'f-contact': '',
    'f-veh': '',
    'f-msg': '',
  });
  protected readonly sent = signal(false);

  protected update(id: string, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.values.update((v) => ({ ...v, [id]: target.value }));
  }

  protected isToday(days: readonly number[]): boolean {
    return days.includes(this.hoursService.activeDay());
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const v = this.values();
    const en = this.L.isEnglish();
    const g = (id: string): string => (v[id] ?? '').trim();
    const name = g('f-name');
    const subject = en
      ? `Quote request — ${name || 'Website'}`
      : `Solicitud de cotización — ${name || 'Sitio web'}`;
    const lines = en
      ? ['Name: ' + name, 'Contact: ' + g('f-contact'), 'Vehicle / wheel: ' + g('f-veh'), '', 'Message:', g('f-msg')]
      : ['Nombre: ' + name, 'Contacto: ' + g('f-contact'), 'Vehículo / aro: ' + g('f-veh'), '', 'Mensaje:', g('f-msg')];
    const href = `${this.contact.email.href}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    this.sent.set(true);
    window.location.href = href;
  }
}
