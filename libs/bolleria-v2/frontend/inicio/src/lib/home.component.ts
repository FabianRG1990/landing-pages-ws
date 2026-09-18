import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AboutBookComponent } from './about-book.component';
import { DespedidaComponent } from './despedida.component';

@Component({
  selector: 'bol-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AboutBookComponent, DespedidaComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {}
