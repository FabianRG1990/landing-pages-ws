import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  effect,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  AutomotivoStore,
  PreloaderComponent,
  SceneTransitionComponent,
  SiteNavComponent,
  SiteFooterComponent,
} from '@automotivo-ui-shared';
import { HeroScrollComponent, HomeComponent } from '@automotivo-ui-inicio';
import { ServicesPageComponent } from '@automotivo-ui-servicios';
import { GalleryPageComponent } from '@automotivo-ui-galeria';
import { AboutPageComponent } from '@automotivo-ui-nosotros';
import { ContactPageComponent } from '@automotivo-ui-contacto';

@Component({
  selector: 'amv-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PreloaderComponent,
    SceneTransitionComponent,
    SiteNavComponent,
    SiteFooterComponent,
    HeroScrollComponent,
    HomeComponent,
    ServicesPageComponent,
    GalleryPageComponent,
    AboutPageComponent,
    ContactPageComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly store = inject(AutomotivoStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    // Al cambiar de segmento, subimos al tope (la cortina cubre el salto).
    effect(() => {
      this.store.screen();
      if (this.isBrowser) {
        queueMicrotask(() => window.scrollTo({ top: 0, behavior: 'auto' }));
      }
    });
  }
}
