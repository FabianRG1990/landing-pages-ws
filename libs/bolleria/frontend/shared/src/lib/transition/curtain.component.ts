import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BolleriaStore } from '../core/bolleria.store';

/** Cortina entre pantallas — transcripción fiel del original. */
@Component({
  selector: 'bol-curtain',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './curtain.component.html',
  styleUrl: './curtain.component.scss',
})
export class CurtainComponent {
  private readonly store = inject(BolleriaStore);
  readonly curtain = this.store.curtain;
}
