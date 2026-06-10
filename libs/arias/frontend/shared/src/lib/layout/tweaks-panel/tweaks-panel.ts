import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface FontOpt { key: string; label: string; display: string; }
interface AccentOpt {
  key: string; label: string;
  wine: string; deep: string; soft: string; glow: string;
}

const FONTS: FontOpt[] = [
  { key: 'clasica', label: 'Clásica', display: "'Cormorant Garamond', Georgia, serif" },
  { key: 'romana', label: 'Romana', display: "'Marcellus', Georgia, serif" },
  { key: 'editorial', label: 'Editorial', display: "'Spectral', Georgia, serif" },
];

const ACCENTS: AccentOpt[] = [
  { key: 'agua', label: 'Agua', wine: '#4F9D99', deep: '#2C6B68', soft: '#84C3BE', glow: 'rgba(79,157,153,0.16)' },
  { key: 'turquesa', label: 'Turquesa', wine: '#3F8F94', deep: '#235E62', soft: '#79BEC1', glow: 'rgba(63,143,148,0.16)' },
  { key: 'salvia', label: 'Salvia', wine: '#6BA597', deep: '#447366', soft: '#9CC7BC', glow: 'rgba(107,165,151,0.16)' },
];

/**
 * Panel de Tweaks: permite explorar tipografías de títulos y acentos de color
 * en vivo. Oculto por defecto; se muestra mediante el protocolo del host
 * (postMessage `__activate_edit_mode`), igual que en el sitio original.
 */
@Component({
  selector: 'app-tweaks-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tweaks-panel.html',
})
export class TweaksPanel {
  protected readonly fonts = FONTS;
  protected readonly accents = ACCENTS;

  protected readonly visible = signal(false);
  protected readonly tipo = signal('clasica');
  protected readonly acento = signal('agua');

  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      this.apply();
      const onMsg = (e: MessageEvent) => {
        const t = e?.data?.type;
        if (t === '__activate_edit_mode') this.visible.set(true);
        else if (t === '__deactivate_edit_mode') this.visible.set(false);
      };
      window.addEventListener('message', onMsg);
      this.post('__edit_mode_available');
      this.destroyRef.onDestroy(() =>
        window.removeEventListener('message', onMsg),
      );
    });
  }

  protected setTipo(key: string): void {
    this.tipo.set(key);
    this.apply();
    this.postEdit('tipo', key);
  }

  protected setAcento(key: string): void {
    this.acento.set(key);
    this.apply();
    this.postEdit('acento', key);
  }

  protected dismiss(): void {
    this.visible.set(false);
    this.post('__edit_mode_dismissed');
  }

  private apply(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const root = document.documentElement;
    const f = FONTS.find((x) => x.key === this.tipo()) ?? FONTS[0];
    root.style.setProperty('--font-display', f.display);
    const a = ACCENTS.find((x) => x.key === this.acento()) ?? ACCENTS[0];
    root.style.setProperty('--wine', a.wine);
    root.style.setProperty('--wine-deep', a.deep);
    root.style.setProperty('--wine-soft', a.soft);
    root.style.setProperty('--wine-glow', a.glow);
  }

  private post(type: string): void {
    try {
      window.parent.postMessage({ type }, '*');
    } catch {
      /* noop */
    }
  }

  private postEdit(key: string, val: string): void {
    try {
      window.parent.postMessage(
        { type: '__edit_mode_set_keys', edits: { [key]: val } },
        '*',
      );
    } catch {
      /* noop */
    }
  }
}
