import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BolleriaStore } from '../core/bolleria.store';

/** Preloader — secuencia de marca (croissant + wordmark), transcripción fiel del original. */
@Component({
  selector: 'bol-preloader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './preloader.component.html',
  styleUrl: './preloader.component.scss',
})
export class PreloaderComponent {
  private readonly store = inject(BolleriaStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly loaded = this.store.loaded;

  constructor() {
    if (this.isBrowser) {
      afterNextRender(() => {
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        setTimeout(() => this.store.markLoaded(), reduced ? 700 : 4150);
      });
    }
  }
}
