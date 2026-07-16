import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BolleriaStore } from '../core/bolleria.store';
import { CONTACT } from '../data/contact-data';
import { ScreenId } from '../core/models';

@Component({
  selector: 'bol-site-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss',
})
export class SiteFooterComponent {
  private readonly store = inject(BolleriaStore);
  readonly contact = CONTACT;

  go(screen: ScreenId): void {
    this.store.go(screen);
  }
}
