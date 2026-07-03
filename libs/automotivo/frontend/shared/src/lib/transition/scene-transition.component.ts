import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AutomotivoStore } from '../core';

@Component({
  selector: 'amv-scene-transition',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scene-transition.component.html',
  styleUrl: './scene-transition.component.scss',
})
export class SceneTransitionComponent {
  private readonly store = inject(AutomotivoStore);

  readonly navigating = this.store.navigating;
  readonly logoOpacity = this.store.logoOpacity;
  readonly transGlow = this.store.transGlow;
  readonly label = this.store.transLabel;

  readonly clip = computed(() => (this.navigating() ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)'));
  readonly logoScale = computed(() => 0.9 + 0.1 * this.logoOpacity());
  readonly lineWidth = computed(() => (this.transGlow() ? 200 : 0) + 'px');
  readonly labelY = computed(() => (this.transGlow() ? 0 : 8) + 'px');
}
