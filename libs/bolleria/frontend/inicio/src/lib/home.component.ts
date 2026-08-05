import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BolleriaStore } from '@bolleria-ui-shared';
import { AboutScrollComponent } from './about-scroll.component';

@Component({
  selector: 'bol-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AboutScrollComponent],
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
