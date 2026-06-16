import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from '@angular/core';
import { RevealDirective } from '@cafe-rosa-ui-shared';

interface InfoItem {
  readonly icon: 'calendar' | 'clock' | 'users';
  readonly text: string;
}

/**
 * Reservar — sección de reserva (info a la izquierda, formulario a la derecha).
 * Equivale a `<ReservationSection/>` del original React. Sin framer-motion;
 * las animaciones de entrada se delegan a `appReveal`.
 */
@Component({
  selector: 'app-reservar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './reservar.html',
  styleUrl: './reservar.scss',
})
export class ReservarPage {
  protected readonly selectedTime = signal('');
  protected readonly guests = signal(2);
  protected readonly submitted = signal(false);

  protected readonly timeSlots: readonly string[] = [
    '9:00', '10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00', '19:00',
  ];

  protected readonly infoItems: readonly InfoItem[] = [
    { icon: 'calendar', text: 'Abierto de lunes a domingo, 8:00 — 21:00' },
    { icon: 'clock', text: 'Confirmación inmediata por email o WhatsApp' },
    { icon: 'users', text: 'Grupos de hasta 20 personas en sala privada' },
  ];

  protected selectTime(t: string): void {
    this.selectedTime.set(t);
  }

  protected incGuests(): void {
    this.guests.update((g) => Math.min(20, g + 1));
  }

  protected decGuests(): void {
    this.guests.update((g) => Math.max(1, g - 1));
  }

  protected onSubmit(e: Event): void {
    e.preventDefault();
    this.submitted.set(true);
  }
}
