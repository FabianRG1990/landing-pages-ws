import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavComponent } from '@moofy-ui-shared/layout/nav/nav';
import { SmoothScroll } from '@moofy-ui-shared/motion/smooth-scroll.service';

@Component({
  selector: 'app-home',
  imports: [NavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  constructor() {
    inject(SmoothScroll).init();
  }
}
