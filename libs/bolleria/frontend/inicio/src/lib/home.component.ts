import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BolleriaStore } from '@bolleria-ui-shared';
import { AboutBookComponent } from './about-book.component';

@Component({
  selector: 'bol-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AboutBookComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly store = inject(BolleriaStore);

  readonly waDirect = this.store.waDirect;

  goMenu(): void {
    this.store.go('menu');
  }
  goCategory(cat: string): void {
    this.store.go('menu', cat);
  }
}
