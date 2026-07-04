import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AutomotivoStore } from '../core';

/** Cortina cinematográfica entre segmentos — transcripción fiel del original. */
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
  readonly transGlow = this.store.transGlow;
  readonly label = this.store.transLabel;
  private readonly logoOpacity = this.store.logoOpacity;

  readonly transStyle = computed(() => {
    const n = this.navigating();
    return 'position:fixed;inset:0;z-index:1500;background:radial-gradient(130% 110% at 50% 45%,#16181d,#050506 70%);display:flex;align-items:center;justify-content:center;clip-path:' +
      (n ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)') + ';transition:clip-path .5s cubic-bezier(.76,0,.24,1);pointer-events:' + (n ? 'auto' : 'none');
  });
  readonly trLogoStyle = computed(() => {
    const o = this.logoOpacity();
    return 'height:clamp(52px,8vw,84px);width:auto;opacity:' + o + ';transform:scale(' + (0.9 + 0.1 * o) +
      ');filter:drop-shadow(0 14px 46px rgba(0,0,0,.7));transition:opacity .5s ease, transform .6s cubic-bezier(.16,1,.3,1)';
  });
  readonly trLineStyle = computed(() => {
    const g = this.transGlow();
    return 'height:2px;width:' + (g ? 200 : 0) + 'px;max-width:60vw;border-radius:2px;background:linear-gradient(90deg,transparent,#FF3B41 22%,#fff 50%,#FF3B41 78%,transparent);box-shadow:0 0 12px rgba(225,29,46,.7);opacity:' + g + ';transition:width .55s cubic-bezier(.16,1,.3,1), opacity .4s ease';
  });
  readonly trLabelStyle = computed(() => {
    const g = this.transGlow();
    return "font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:600;font-size:13px;letter-spacing:.42em;text-transform:uppercase;color:#c3c6cc;opacity:" + g + ';transform:translateY(' + (g ? 0 : 8) + 'px);transition:opacity .5s ease .05s, transform .5s cubic-bezier(.16,1,.3,1) .05s';
  });
  readonly glowStyle = computed(() =>
    'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(70vw,520px);height:min(70vw,520px);background:radial-gradient(circle,rgba(225,29,46,.16),transparent 66%);filter:blur(20px);opacity:' + this.transGlow() + ';transition:opacity .5s ease');
}
