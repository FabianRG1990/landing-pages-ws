import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AboutBookComponent } from './about-book.component';

@Component({
  selector: 'bol-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AboutBookComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {}
