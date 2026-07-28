import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'bol-entremes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './entremes.component.html',
  styleUrl: './entremes.component.scss',
})
export class EntremesComponent {}
