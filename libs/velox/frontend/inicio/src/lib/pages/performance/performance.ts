import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  CountUpDirective,
  PERF_STATS,
  ParallaxDirective,
  RevealDirective,
} from '@velox-ui-shared';

/** Segmento Performance (`/performance`) — banda full-bleed + contadores. */
@Component({
  selector: 'app-performance-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, ParallaxDirective, CountUpDirective],
  templateUrl: './performance.html',
})
export class PerformancePage {
  protected readonly perfStats = PERF_STATS;
}
