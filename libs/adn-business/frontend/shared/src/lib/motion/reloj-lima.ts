import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
  afterNextRender,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Hora local de Lima en vivo. Es el detalle pequeno que dice que detras
 * hay gente y no una plantilla. SSR-safe: pinta guiones hasta hidratar.
 */
@Component({
  selector: 'app-reloj-lima',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="mono">{{ hora() }}</span>`,
  styles: `
    :host {
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class RelojLimaComponent {
  protected readonly hora = signal('--:--:--');

  private readonly destroyRef = inject(DestroyRef);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    afterNextRender(() => {
      if (!this.esNavegador) return;
      const tic = () => this.hora.set(this.formatear());
      tic();
      const id = setInterval(tic, 1000);
      this.destroyRef.onDestroy(() => clearInterval(id));
    });
  }

  private formatear(): string {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());
  }
}
