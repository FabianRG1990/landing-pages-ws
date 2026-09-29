import { ChangeDetectionStrategy, Component, PLATFORM_ID, afterNextRender, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavComponent } from '@moofy-ui-shared/layout/nav/nav';
import { SmoothScroll } from '@moofy-ui-shared/motion/smooth-scroll.service';
import { refrescarConFuentes } from '@moofy-ui-shared/motion/escena';
import { HeroComponent } from '../../sections/hero/hero';
import { FabricaComponent } from '../../sections/fabrica/fabrica';
import { LineasComponent } from '../../sections/lineas/lineas';
import { CintaComponent } from '../../sections/cinta/cinta';
import { CanalesComponent } from '../../sections/canales/canales';
import { ProcesoComponent } from '../../sections/proceso/proceso';
import { FirmaComponent } from '../../sections/firma/firma';
import { ContactoComponent } from '../../sections/contacto/contacto';
import { PieComponent } from '@moofy-ui-shared/layout/pie/pie';

@Component({
  selector: 'app-home',
  imports: [NavComponent, HeroComponent, FabricaComponent, LineasComponent, CintaComponent, CanalesComponent, ProcesoComponent, FirmaComponent, ContactoComponent, PieComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  constructor() {
    inject(SmoothScroll).init();
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    afterNextRender(() => {
      if (esNavegador) refrescarConFuentes();
    });
  }
}
